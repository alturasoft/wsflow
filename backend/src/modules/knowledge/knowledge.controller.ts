import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeService } from './knowledge.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    if (tenantId) return tenantId;
    const firstTenant = await this.prisma.tenant.findFirst();
    if (!firstTenant) {
      throw new BadRequestException('No existe ningún tenant registrado en el sistema.');
    }
    return firstTenant.id;
  }

  @Get('status')
  async getStatus() {
    return this.knowledgeService.getStatus();
  }

  @Get('documents')
  async listDocuments(@Query('tenantId') tenantId?: string) {
    const tid = await this.resolveTenantId(tenantId);
    return this.knowledgeService.listDocuments(tid);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('tenantId') tenantId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere adjuntar un archivo PDF.');
    }
    if (!file.mimetype.includes('pdf') && !file.originalname.endsWith('.pdf')) {
      throw new BadRequestException('Solo se admiten documentos en formato PDF.');
    }

    const tid = await this.resolveTenantId(tenantId);
    return this.knowledgeService.processPdf(tid, file, title);
  }

  @Delete('documents/:id')
  async deleteDocument(
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.resolveTenantId(tenantId);
    return this.knowledgeService.deleteDocument(tid, id);
  }

  @Post('query')
  async queryRAG(
    @Body()
    body: {
      question: string;
      tenantId?: string;
      limit?: number;
      companyName?: string;
      customPrompt?: string;
    },
  ) {
    if (!body.question || !body.question.trim()) {
      throw new BadRequestException('Se requiere el campo "question".');
    }

    const tid = await this.resolveTenantId(body.tenantId);
    return this.knowledgeService.queryKnowledge({
      tenantId: tid,
      question: body.question,
      limit: body.limit || 3,
      companyName: body.companyName,
      customPrompt: body.customPrompt,
    });
  }
}
