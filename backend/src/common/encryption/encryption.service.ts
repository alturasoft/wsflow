import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.key = Buffer.from(rawKey.substring(0, 64), 'hex');
  }

  /**
   * Encripta un texto plano usando AES-256-GCM
   * Retorna formato: iv:authTag:encryptedText
   */
  encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Desencripta un valor cifrado en formato iv:authTag:encryptedText
   */
  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        // Si no está en formato cifrado (ej. token plano o mock en desarrollo), devolver directamente
        return cipherText;
      }
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Error al desencriptar credencial', error);
      throw new Error('Fallo de desencriptación');
    }
  }
}
