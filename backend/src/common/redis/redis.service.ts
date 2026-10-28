import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    this.logger.log(`Conectando a Redis en ${host}:${port}...`);
    this.client = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.client.on('connect', () => {
      this.logger.log('Conexión con Redis establecida con éxito.');
    });

    this.client.on('error', (err) => {
      this.logger.error('Error en conexión Redis:', err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Intenta registrar un wamid de Meta de forma atómica para deduplicación.
   * Si ya existe, retorna false (mensaje duplicado).
   * TTL de 48 horas (172800 segundos).
   */
  async acquireMessageLock(wamid: string): Promise<boolean> {
    if (!wamid) return true;
    const key = `msg:dedup:${wamid}`;
    const result = await this.client.set(key, '1', 'EX', 172800, 'NX');
    return result === 'OK';
  }

  /**
   * Obtiene la sesión conversacional en caliente (sub-milimétrico)
   */
  async getSession(tenantId: string, phone: string): Promise<any | null> {
    const key = `session:${tenantId}:${phone}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Guarda o actualiza la sesión con TTL de 24 horas (alineado a la ventana de Meta)
   */
  async saveSession(tenantId: string, phone: string, sessionData: any, ttlSeconds = 86400): Promise<void> {
    const key = `session:${tenantId}:${phone}`;
    await this.client.set(key, JSON.stringify(sessionData), 'EX', ttlSeconds);
  }

  /**
   * Elimina la sesión en caché
   */
  async deleteSession(tenantId: string, phone: string): Promise<void> {
    const key = `session:${tenantId}:${phone}`;
    await this.client.del(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Conexión Redis cerrada.');
    }
  }
}
