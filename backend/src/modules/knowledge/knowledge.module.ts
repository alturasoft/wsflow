import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [KnowledgeController],
  providers: [
    QdrantService,
    EmbeddingService,
    PdfExtractorService,
    KnowledgeService,
  ],
  exports: [KnowledgeService, QdrantService, EmbeddingService],
})
export class KnowledgeModule {}
