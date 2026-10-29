import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface ChunkPayload {
  tenant_id: string;
  document_id: string;
  title: string;
  file_name: string;
  page_number: number;
  chunk_index: number;
  content: string;
  [key: string]: any;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload: ChunkPayload;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient | null = null;
  public readonly collectionName = 'tenant_knowledge_bases';
  // Tamaño estándar: 768 para Gemini text-embedding-004, 1536 para OpenAI text-embedding-3-small
  private readonly vectorSize: number;

  constructor(private readonly config: ConfigService) {
    const rawDim = this.config.get<string>('EMBEDDING_DIMENSIONS') || '768';
    this.vectorSize = parseInt(rawDim, 10);
  }

  async onModuleInit() {
    const qdrantUrl =
      this.config.get<string>('QDRANT_URL') || 'http://localhost:6333';
    this.logger.log(`Inicializando conexión a Qdrant en: ${qdrantUrl}`);

    try {
      this.client = new QdrantClient({ url: qdrantUrl, checkCompatibility: false });
      await this.ensureCollection();
      this.logger.log(`✓ Qdrant conectado y colección "${this.collectionName}" lista.`);
    } catch (err: any) {
      this.logger.warn(
        `No se pudo conectar a Qdrant en ${qdrantUrl}: ${err.message}. El servicio reintentará en la primera consulta.`,
      );
    }
  }

  private async getClient(): Promise<QdrantClient> {
    if (!this.client) {
      const qdrantUrl =
        this.config.get<string>('QDRANT_URL') || 'http://localhost:6333';
      this.client = new QdrantClient({ url: qdrantUrl, checkCompatibility: false });
      await this.ensureCollection();
    }
    return this.client;
  }

  /**
   * Garantiza que la colección exista con configuración optimizada para bajo consumo de RAM
   */
  async ensureCollection(): Promise<void> {
    if (!this.client) return;

    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(
          `Creando colección "${this.collectionName}" (dim: ${this.vectorSize}, Cosine, on_disk: true)...`,
        );

        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
            on_disk: true, // Almacena vectores en disco con mmap para no saturar la RAM
          },
          optimizers_config: {
            memmap_threshold: 20000,
          },
        });

        // Crear índices sobre metadatos para filtrado ultra-rápido por tenant y documento
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'tenant_id',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'document_id',
          field_schema: 'keyword',
        });

        this.logger.log(`✓ Colección "${this.collectionName}" e índices creados con éxito.`);
      }
    } catch (err: any) {
      this.logger.error(`Error verificando colección Qdrant: ${err.message}`);
      throw err;
    }
  }

  /**
   * Inserta o actualiza un lote de fragmentos vectorizados
   */
  async upsertChunks(
    points: Array<{
      id: string;
      vector: number[];
      payload: ChunkPayload;
    }>,
  ): Promise<void> {
    const client = await this.getClient();
    await client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  /**
   * Búsqueda por similitud vectorial con aislamiento estricto por tenant
   */
  async search(
    tenantId: string,
    queryVector: number[],
    limit = 3,
    scoreThreshold = 0.55,
  ): Promise<SearchResult[]> {
    const client = await this.getClient();

    const response = await client.query(this.collectionName, {
      query: queryVector,
      filter: {
        must: [
          {
            key: 'tenant_id',
            match: { value: tenantId },
          },
        ],
      },
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    const points = response.points || [];
    return points.map((hit) => ({
      id: hit.id,
      score: hit.score,
      payload: hit.payload as ChunkPayload,
    }));
  }

  /**
   * Obtiene todos los fragmentos de un tenant para búsqueda híbrida (léxica + vectorial)
   */
  async scrollByTenant(tenantId: string, limit = 250): Promise<ChunkPayload[]> {
    const client = await this.getClient();
    const response = await client.scroll(this.collectionName, {
      filter: {
        must: [
          {
            key: 'tenant_id',
            match: { value: tenantId },
          },
        ],
      },
      limit,
      with_payload: true,
      with_vector: false,
    });

    const points = response.points || [];
    return points
      .map((p) => p.payload as ChunkPayload)
      .sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
  }

  /**
   * Elimina todos los vectores asociados a un documento específico
   */
  async deleteByDocumentId(tenantId: string, documentId: string): Promise<void> {
    const client = await this.getClient();
    await client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'tenant_id', match: { value: tenantId } },
          { key: 'document_id', match: { value: documentId } },
        ],
      },
    });
  }

  /**
   * Elimina todos los vectores de un tenant (ej. baja de cuenta)
   */
  async deleteByTenantId(tenantId: string): Promise<void> {
    const client = await this.getClient();
    await client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [{ key: 'tenant_id', match: { value: tenantId } }],
      },
    });
  }

  /**
   * Estado de salud y conteo de vectores
   */
  async getStatus(): Promise<{ connected: boolean; collection?: any; error?: string }> {
    try {
      const client = await this.getClient();
      const info = await client.getCollection(this.collectionName);
      return {
        connected: true,
        collection: {
          points_count: info.points_count,
          indexed_vectors_count: info.indexed_vectors_count,
          status: info.status,
        },
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err.message,
      };
    }
  }
}
