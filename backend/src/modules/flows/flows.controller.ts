import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api')
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('tenants')
  async getTenants() {
    return this.prisma.tenant.findMany({
      include: {
        whatsappAccounts: true,
      },
    });
  }

  @Get('flows')
  async listFlows(@Query('tenantId') tenantId?: string) {
    return this.flowsService.listFlows(tenantId);
  }

  @Post('flows')
  async createFlow(
    @Body()
    body: {
      name: string;
      description?: string;
      tenantId?: string;
      triggerKeywords?: string[];
    },
  ) {
    return this.flowsService.createFlow(body);
  }

  @Get('flows/:id')
  async getFlow(@Param('id') id: string) {
    return this.flowsService.getFlowById(id);
  }

  @Delete('flows/:id')
  async deleteFlow(@Param('id') id: string) {
    return this.flowsService.deleteFlow(id);
  }

  @Put('flows/:id')
  async updateFlow(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      triggerKeywords?: string[];
      isActive?: boolean;
    },
  ) {
    return this.flowsService.updateFlow(id, body);
  }

  @Put('flows/:id/set-default')
  async setDefaultFlow(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.flowsService.setDefaultFlow(id, tenantId);
  }

  @Put('flows/:id/draft')
  async saveDraft(@Param('id') id: string, @Body() body: { definition: any }) {
    return this.flowsService.saveDraft(id, body.definition);
  }

  @Post('flows/:id/publish')
  async publishFlow(
    @Param('id') id: string,
    @Body() body: { definition?: any; changelog?: string },
  ) {
    return this.flowsService.publishVersion(id, body.definition, body.changelog);
  }

  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const [totalConversations, activeSessions, handedOffSessions, totalMessages] =
      await Promise.all([
        this.prisma.conversation.count({ where }),
        this.prisma.conversation.count({ where: { ...where, status: 'BOT_ACTIVE' } }),
        this.prisma.conversation.count({ where: { ...where, status: 'HANDED_OFF' } }),
        this.prisma.message.count({ where }),
      ]);

    return {
      totalConversations,
      activeSessions,
      handedOffSessions,
      totalMessages,
    };
  }
}
