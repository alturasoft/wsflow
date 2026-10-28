import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async listConversations(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return this.conversationsService.listConversations({ tenantId, status });
  }

  @Get(':id')
  async getConversationMessages(@Param('id') id: string) {
    return this.conversationsService.getConversationMessages(id);
  }

  @Post(':id/reply')
  async sendReply(
    @Param('id') id: string,
    @Body() body: { text: string; agentId?: string },
  ) {
    return this.conversationsService.sendAgentReply(id, body.text, body.agentId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'BOT_ACTIVE' | 'HANDED_OFF' | 'CLOSED' },
  ) {
    return this.conversationsService.updateStatus(id, body.status);
  }
}
