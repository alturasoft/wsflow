import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly encryption: EncryptionService,
    private readonly redis: RedisService,
  ) {}

  async listConversations(params: { tenantId?: string; status?: string }) {
    const where: any = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.status && params.status !== 'ALL') where.status = params.status;

    return this.prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        whatsappAccount: {
          select: {
            id: true,
            name: true,
            displayPhoneNumber: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Último mensaje para la vista previa
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationMessages(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        whatsappAccount: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const isWindowActive = new Date(conversation.windowExpiresAt).getTime() > Date.now();

    return {
      conversation,
      isWindowActive,
      messages,
    };
  }

  async sendAgentReply(conversationId: string, text: string, agentId?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        whatsappAccount: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    const account = conversation.whatsappAccount;
    const accessToken = this.encryption.decrypt(account.accessTokenEncrypted) || account.accessTokenEncrypted;

    // 1. Enviar mensaje por WhatsApp Cloud API
    await this.whatsapp.sendText(
      account.phoneNumberId,
      accessToken,
      conversation.contact.phoneNumber,
      text,
    );

    // 2. Registrar mensaje en PostgreSQL
    const message = await this.prisma.message.create({
      data: {
        tenantId: conversation.tenantId,
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'AGENT',
        senderId: agentId || null,
        type: 'TEXT',
        content: { text },
        status: 'SENT',
      },
    });

    // 3. Actualizar conversación
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'HANDED_OFF', // Asegurar que el bot esté silenciado durante atención humana
        updatedAt: new Date(),
      },
    });

    // 4. Actualizar estado en Redis para silenciar el bot
    const session = await this.redis.getSession(conversation.tenantId, conversation.contact.phoneNumber);
    if (session) {
      session.status = 'HANDED_OFF';
      await this.redis.saveSession(conversation.tenantId, conversation.contact.phoneNumber, session);
    }

    return message;
  }

  async updateStatus(conversationId: string, status: 'BOT_ACTIVE' | 'HANDED_OFF' | 'CLOSED') {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status, updatedAt: new Date() },
      include: { contact: true },
    });

    // Sincronizar en Redis
    const session = await this.redis.getSession(conversation.tenantId, conversation.contact.phoneNumber);
    if (session) {
      session.status = status;
      if (status === 'CLOSED') {
        await this.redis.deleteSession(conversation.tenantId, conversation.contact.phoneNumber);
      } else {
        await this.redis.saveSession(conversation.tenantId, conversation.contact.phoneNumber, session);
      }
    }

    return conversation;
  }
}
