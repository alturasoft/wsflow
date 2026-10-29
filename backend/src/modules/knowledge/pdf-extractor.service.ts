import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import axios from 'axios';

export interface ExtractedChunk {
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  chunks: ExtractedChunk[];
  method: 'EMBEDDED_TEXT' | 'MULTIMODAL_OCR';
}

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);
  private readonly geminiApiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.geminiApiKey =
      this.config.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      undefined;
  }

  /**
   * Extrae el contenido de un buffer de PDF y genera los chunks semánticos
   */
  async extractAndChunk(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
    this.logger.log(`Iniciando extracción de PDF (${(pdfBuffer.length / 1024).toFixed(1)} KB)...`);

    let rawText = '';
    let pageCount = 1;
    let method: 'EMBEDDED_TEXT' | 'MULTIMODAL_OCR' = 'EMBEDDED_TEXT';
    let pageList: Array<{ text: string; num: number }> = [];
    let nativeExtractionError: string | null = null;

    try {
      const anyPdf: any = pdfParse;

      // 1. Compatibilidad con pdf-parse v2 (Class PDFParse)
      if (anyPdf.PDFParse && typeof anyPdf.PDFParse === 'function') {
        const parser = new anyPdf.PDFParse({ data: pdfBuffer });
        const res = await parser.getText();
        rawText = (res.text || '').trim();
        pageCount = res.total || res.pages?.length || 1;
        if (Array.isArray(res.pages) && res.pages.length > 0) {
          pageList = res.pages;
        }
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
      // 2. Compatibilidad con pdf-parse v1 (Función tradicional)
      else if (typeof anyPdf === 'function') {
        const pdfData = await anyPdf(pdfBuffer);
        rawText = (pdfData.text || '').trim();
        pageCount = pdfData.numpages || 1;
      }
      // 3. Exportación default
      else if (anyPdf.default && typeof anyPdf.default === 'function') {
        const pdfData = await anyPdf.default(pdfBuffer);
        rawText = (pdfData.text || '').trim();
        pageCount = pdfData.numpages || 1;
      } else {
        throw new Error('No se detectó un constructor o función de parseo compatible en la librería pdf-parse.');
      }

      this.logger.log(
        `✓ Extracción nativa completada: ${pageCount} página(s), ${rawText.length} caracteres detectados.`,
      );
    } catch (err: any) {
      nativeExtractionError = err.message;
      this.logger.warn(`Fallo al leer texto nativo del PDF: ${err.message}`);
    }

    // 2. Si el texto nativo es nulo o menor a 30 caracteres, probablemente sea un escaneo (imagen pura)
    if (rawText.length < 30) {
      if (this.geminiApiKey) {
        this.logger.log(
          'PDF escaneado o sin capa de texto legible detectado. Ejecutando OCR ligero vía Gemini Multimodal Vision API...',
        );
        rawText = await this.performMultimodalOcr(pdfBuffer);
        method = 'MULTIMODAL_OCR';
      } else {
        if (nativeExtractionError) {
          throw new Error(`Error al leer el archivo PDF: ${nativeExtractionError}`);
        }
        throw new Error(
          'El archivo PDF parece ser una imagen o escaneo sin texto legible. Para procesar documentos escaneados configura GEMINI_API_KEY en .env.',
        );
      }
    }

    // 3. Generar fragmentos (chunking) semánticos
    let chunks: ExtractedChunk[] = [];
    if (pageList.length > 0) {
      let globalIndex = 0;
      for (const page of pageList) {
        const pageChunks = this.createSemanticChunks(page.text, 1, 700, 100);
        for (const pc of pageChunks) {
          chunks.push({
            pageNumber: page.num,
            chunkIndex: globalIndex++,
            content: pc.content,
          });
        }
      }
    } else {
      chunks = this.createSemanticChunks(rawText, pageCount, 700, 100);
    }

    this.logger.log(
      `✓ Documento segmentado con éxito en ${chunks.length} fragmentos semánticos (${method}).`,
    );

    return {
      text: rawText,
      pageCount,
      chunks,
      method,
    };
  }

  /**
   * OCR vía Gemini 1.5 Flash (soporta PDFs en Base64 directamente sin carga en el servidor)
   */
  private async performMultimodalOcr(pdfBuffer: Buffer): Promise<string> {
    try {
      const base64Pdf = pdfBuffer.toString('base64');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: base64Pdf,
                  },
                },
                {
                  text: 'Extrae todo el texto contenido en este documento PDF con máxima fidelidad. Conserva títulos, secciones, listas y datos importantes. Devuelve únicamente el texto extraído.',
                },
              ],
            },
          ],
        },
        { timeout: 30000 },
      );

      const ocrResult =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!ocrResult || ocrResult.length < 20) {
        throw new Error('Gemini Vision no pudo extraer texto legible del PDF');
      }
      return ocrResult;
    } catch (err: any) {
      this.logger.error(
        `Error en OCR Multimodal: ${err.response?.data?.error?.message || err.message}`,
      );
      throw err;
    }
  }

  /**
   * Algoritmo de fragmentación semántica (Recursive Chunking)
   * Tamaño objetivo: ~700 caracteres, con 100 caracteres de solapamiento
   */
  private createSemanticChunks(
    fullText: string,
    totalEstimatedPages: number,
    chunkSize = 700,
    overlap = 100,
  ): ExtractedChunk[] {
    const cleaned = fullText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleaned) return [];

    // Dividir en párrafos primero
    const paragraphs = cleaned.split(/\n\s*\n/);
    const chunks: ExtractedChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const p = paragraph.trim();
      if (!p) continue;

      if ((currentChunk + '\n\n' + p).length <= chunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${p}` : p;
      } else {
        if (currentChunk.length > 0) {
          chunks.push({
            pageNumber: Math.min(
              totalEstimatedPages,
              Math.max(1, Math.round((chunkIndex / Math.max(1, paragraphs.length)) * totalEstimatedPages)),
            ),
            chunkIndex,
            content: currentChunk.trim(),
          });
          chunkIndex++;

          // Generar solapamiento con el final del chunk anterior
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText + ' ' + p;
        } else {
          // El párrafo individual es más grande que chunkSize: dividir por oraciones
          const sentences = p.split(/(?<=[.?!])\s+/);
          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).length <= chunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk) {
                chunks.push({
                  pageNumber: Math.min(
                    totalEstimatedPages,
                    Math.max(1, Math.round((chunkIndex / Math.max(1, paragraphs.length)) * totalEstimatedPages)),
                  ),
                  chunkIndex,
                  content: currentChunk.trim(),
                });
                chunkIndex++;
                currentChunk = currentChunk.slice(-overlap) + ' ' + sentence;
              } else {
                // Oración extremadamente larga, dividir por longitud pura
                chunks.push({
                  pageNumber: 1,
                  chunkIndex,
                  content: sentence.slice(0, chunkSize).trim(),
                });
                chunkIndex++;
                currentChunk = sentence.slice(chunkSize - overlap);
              }
            }
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        pageNumber: totalEstimatedPages,
        chunkIndex,
        content: currentChunk.trim(),
      });
    }

    return chunks;
  }
}
