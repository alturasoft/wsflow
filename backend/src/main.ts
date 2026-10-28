import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Fundamental para la verificación de firma X-Hub-Signature-256 de Meta
  });

  // Habilitar CORS para panel de administración React/Next.js
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`🚀 WSFlow Multi-Tenant Backend activo en puerto ${port}`);
  logger.log(`📡 Webhook endpoint: http://localhost:${port}/webhook/whatsapp`);
  logger.log(`====================================================`);
}
bootstrap();
