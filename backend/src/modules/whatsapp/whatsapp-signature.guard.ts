import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WhatsAppSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const appSecret = process.env.META_APP_SECRET;

    // En desarrollo, si no se ha configurado aún el App Secret de Meta, permitimos la prueba con log
    if (!appSecret || appSecret === 'your_meta_app_secret_here') {
      this.logger.warn(
        'META_APP_SECRET no está configurado en .env. Omitiendo validación de firma SHA-256 (Solo entorno desarrollo).',
      );
      return true;
    }

    const signature = request.headers['x-hub-signature-256'] as string;
    if (!signature) {
      this.logger.error('Falta la cabecera X-Hub-Signature-256 de Meta');
      throw new UnauthorizedException('Falta la cabecera X-Hub-Signature-256');
    }

    const rawBody: Buffer = request.rawBody;
    if (!rawBody) {
      this.logger.error(
        'El cuerpo crudo (rawBody) de la petición no está disponible para calcular HMAC',
      );
      throw new UnauthorizedException('rawBody no disponible para verificar firma');
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      this.logger.error('Firma X-Hub-Signature-256 inválida recibida de Meta');
      throw new UnauthorizedException('Firma de webhook inválida');
    }

    return true;
  }
}
