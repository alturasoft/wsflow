import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QdrantService, ChunkPayload } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { randomUUID } from 'crypto';

export interface RAGQueryResult {
  answer: string;
  sources: Array<{
    documentId: string;
    title: string;
    pageNumber: number;
    score: number;
    content: string;
  }>;
  totalFound: number;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly embeddings: EmbeddingService,
    private readonly pdfExtractor: PdfExtractorService,
  ) {}

  /**
   * Procesa, fragmenta, vectoriza y almacena un documento PDF en Qdrant
   */
  async processPdf(
    tenantId: string,
    file: Express.Multer.File,
    title?: string,
  ): Promise<any> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Archivo PDF no válido o vacío.');
    }

    const docTitle = title || file.originalname.replace(/\.[^/.]+$/, '');
    this.logger.log(
      `Iniciando ingestión de "${docTitle}" (${file.originalname}) para Tenant: ${tenantId}`,
    );

    // 1. Crear registro inicial en PostgreSQL
    const docRecord = await this.prisma.knowledgeDocument.create({
      data: {
        tenantId,
        title: docTitle,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype || 'application/pdf',
        status: 'PROCESSING',
      },
    });

    try {
      // 2. Extraer texto y generar fragmentos semánticos
      const extraction = await this.pdfExtractor.extractAndChunk(file.buffer);

      if (extraction.chunks.length === 0) {
        throw new Error('No se pudo extraer ningún fragmento de texto legible del documento.');
      }

      // 3. Generar embeddings por lotes
      this.logger.log(
        `Generando embeddings para ${extraction.chunks.length} fragmentos...`,
      );
      const textList = extraction.chunks.map((c) => c.content);
      const vectors = await this.embeddings.getEmbeddingsBatch(textList);

      // 4. Construir puntos para Qdrant
      const points = extraction.chunks.map((chunk, index) => {
        const pointId = randomUUID();
        const payload: ChunkPayload = {
          tenant_id: tenantId,
          document_id: docRecord.id,
          title: docTitle,
          file_name: file.originalname,
          page_number: chunk.pageNumber,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
        };

        return {
          id: pointId,
          vector: vectors[index],
          payload,
        };
      });

      // 5. Inserción masiva en Qdrant
      await this.qdrant.upsertChunks(points);

      // 6. Actualizar registro a INDEXED
      const updated = await this.prisma.knowledgeDocument.update({
        where: { id: docRecord.id },
        data: {
          status: 'INDEXED',
          pageCount: extraction.pageCount,
          chunkCount: extraction.chunks.length,
          metadata: {
            method: extraction.method,
            indexedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `✓ Documento "${docTitle}" indexado exitosamente (${extraction.chunks.length} vectores en Qdrant).`,
      );

      return updated;
    } catch (err: any) {
      this.logger.error(`Fallo indexando documento ${docRecord.id}: ${err.message}`);
      await this.prisma.knowledgeDocument.update({
        where: { id: docRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
      throw new BadRequestException(`Error al procesar el PDF: ${err.message}`);
    }
  }

  /**
   * Lista los documentos de la base de conocimiento para un tenant
   */
  async listDocuments(tenantId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Elimina un documento y purga sus vectores en Qdrant
   */
  async deleteDocument(tenantId: string, documentId: string) {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new NotFoundException('Documento no encontrado.');
    }

    // Purgar de Qdrant
    try {
      await this.qdrant.deleteByDocumentId(tenantId, documentId);
    } catch (err: any) {
      this.logger.warn(
        `No se pudieron eliminar los vectores en Qdrant para ${documentId}: ${err.message}`,
      );
    }

    // Eliminar de PostgreSQL
    return this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });
  }

  /**
   * Realiza la consulta con análisis semántico, búsqueda vectorial en Qdrant y síntesis directa
   */
  async queryKnowledge(params: {
    tenantId: string;
    question: string;
    limit?: number;
    companyName?: string;
    customPrompt?: string;
  }): Promise<RAGQueryResult> {
    const { tenantId, question, limit = 3, companyName, customPrompt } = params;

    // 1. Análisis semántico de la consulta del usuario (intención y expansión de conceptos clave)
    const semanticAnalysis = this.embeddings.analyzeAndExpandSemanticQuery(question);

    // 2. Vectorizar la consulta semántica
    const queryVector = await this.embeddings.getEmbedding(
      semanticAnalysis.semanticQueryForEmbedding,
    );

    // 3. Búsqueda vectorial densa en Qdrant
    const vectorResults = await this.qdrant.search(
      tenantId,
      queryVector,
      Math.max(limit * 3, 12),
      0.25, // Umbral para capturar similitudes semánticas relevantes
    );

    // Obtener los fragmentos indexados del tenant para re-ranking híbrido
    const allChunks = await this.qdrant.scrollByTenant(tenantId, 250);
    const vectorScoreMap = new Map<string, number>();
    for (const vr of vectorResults) {
      const key = `${vr.payload.document_id}_${vr.payload.chunk_index}`;
      vectorScoreMap.set(key, vr.score);
    }

    // 4. Cálculo combinado de similitud semántica vectorial y correspondencia léxica
    const combinedCandidates = allChunks.map((payload) => {
      const key = `${payload.document_id}_${payload.chunk_index}`;
      const vecScore = vectorScoreMap.get(key) ?? 0;

      // Calcular coincidencia léxica sobre la pregunta y sobre los términos semánticos expandidos
      let lexScore = this.embeddings.computeLexicalScore(
        question,
        payload.content,
        payload.title,
      );

      if (semanticAnalysis.expandedTerms.length > 0) {
        const expandedLex = this.embeddings.computeLexicalScore(
          semanticAnalysis.expandedTerms.join(' '),
          payload.content,
          payload.title,
        );
        lexScore = Math.max(lexScore, expandedLex * 0.85);
      }

      // La similitud vectorial densa de OpenAI/Gemini tiene prioridad semántica
      const hybridBlend = vecScore * 0.70 + lexScore * 0.30;
      const finalScore = Math.max(hybridBlend, vecScore, lexScore);

      return {
        payload,
        score: Math.round(finalScore * 100) / 100,
        lexScore,
        vecScore,
      };
    });

    combinedCandidates.sort((a, b) => b.score - a.score);

    // Filtrar los mejores fragmentos que superen el umbral semántico de relevancia
    const topResults = combinedCandidates
      .filter((c) => c.score >= 0.35 || c.vecScore >= 0.40 || c.lexScore >= 0.25)
      .slice(0, limit);

    // Si ningún fragmento alcanza el umbral semántico, responder honestamente sin inventar datos
    if (topResults.length === 0) {
      this.logger.log(
        `Sin coincidencia semántica relevante para la consulta: "${question}"`,
      );
      return {
        answer:
          'Actualmente no disponemos de información sobre ese detalle en nuestros registros oficiales. Si deseas, te comunico con un asesor ejecutivo para orientarte.',
        sources: [],
        totalFound: 0,
      };
    }

    // 5. Sintetizar respuesta directa con IA usando los fragmentos semánticos seleccionados
    const contextTexts = topResults.map((r) => r.payload.content);
    const answer = await this.embeddings.synthesizeAnswer({
      question,
      contextChunks: contextTexts,
      companyName,
      customPrompt,
    });

    return {
      answer,
      sources: topResults.map((r) => ({
        documentId: r.payload.document_id,
        title: r.payload.title,
        pageNumber: r.payload.page_number,
        score: Math.round(r.score * 100) / 100,
        content: r.payload.content,
      })),
      totalFound: topResults.length,
    };
  }

  /**
   * Estado del motor vectorial Qdrant y estado del proveedor de IA
   */
  async getStatus() {
    const qdrantStatus = await this.qdrant.getStatus();
    return {
      ...qdrantStatus,
      aiProvider: this.embeddings.getAiProvider(),
      hasAiKey: this.embeddings.hasApiKey(),
    };
  }
}
