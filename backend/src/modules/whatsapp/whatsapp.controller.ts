import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WHATSAPP_QUEUE_NAME, WhatsAppJobType } from '../queue/queue.constants';
import { WhatsAppSignatureGuard } from './whatsapp-signature.guard';
import { WhatsAppWebhookPayload } from './dto/webhook-event.dto';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('webhook/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE_NAME) private readonly queue: Queue,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Endpoint GET para la verificación de Webhook por parte de Meta Cloud API
   */
  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Solicitud de verificación de webhook recibida con token: ${token}`);

    const globalVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    // Verificar si coincide con el token global o con el token de alguna cuenta WABA tenant
    let isAuthorized = mode === 'subscribe' && token === globalVerifyToken;

    if (!isAuthorized && mode === 'subscribe' && token) {
      const account = await this.prisma.whatsAppAccount.findFirst({
        where: { webhookVerifyToken: token },
      });
      if (account) {
        isAuthorized = true;
      }
    }

    if (isAuthorized) {
      this.logger.log('Webhook de WhatsApp verificado exitosamente por Meta.');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.error('Verificación de webhook rechazada: Token no coincide.');
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  /**
   * Endpoint POST para la recepción de mensajes y eventos de Meta
   */
  @Post()
  @UseGuards(WhatsAppSignatureGuard)
  async receiveWebhook(@Body() payload: WhatsAppWebhookPayload, @Res() res: Response) {
    // 1. Responder HTTP 200 INMEDIATAMENTE a Meta para evitar retries y bloqueos
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    this.logger.log(`Webhook POST entrante recibido: ${JSON.stringify(payload)}`);

    try {
      if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
        this.logger.warn(`Payload ignorado: no es whatsapp_business_account o falta entry`);
        return;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value || value.messaging_product !== 'whatsapp') continue;

          const phoneNumberId = value.metadata?.phone_number_id;

          // A) Procesamiento de Mensajes Entrantes
          if (value.messages && value.messages.length > 0) {
            const contacts = value.contacts || [];

            for (const msg of value.messages) {
              const wamid = msg.id;

              // Deduplicación atómica en Redis
              const isFirstTime = await this.redis.acquireMessageLock(wamid);
              if (!isFirstTime) {
                this.logger.warn(`Mensaje duplicado ignorado (wamid: ${wamid})`);
                continue;
              }

              const contactProfile = contacts.find((c) => c.wa_id === msg.from);
              const profileName = contactProfile?.profile?.name;

              let textBody: string | undefined;
              let buttonReplyId: string | undefined;
              let listReplyId: string | undefined;
              let flowResponseJson: string | undefined;

              if (msg.type === 'text') {
                textBody = msg.text?.body;
              } else if (msg.type === 'interactive') {
                if (msg.interactive?.type === 'button_reply') {
                  buttonReplyId = msg.interactive.button_reply?.id;
                  textBody = msg.interactive.button_reply?.title;
                } else if (msg.interactive?.type === 'list_reply') {
                  listReplyId = msg.interactive.list_reply?.id;
                  textBody = msg.interactive.list_reply?.title;
                } else if (msg.interactive?.type === 'nfm_reply') {
                  flowResponseJson = msg.interactive.nfm_reply?.response_json;
                  textBody = msg.interactive.nfm_reply?.body;
                }
              } else if (msg.type === 'button') {
                buttonReplyId = msg.button?.payload;
                textBody = msg.button?.text;
              }

              // Encolar trabajo en BullMQ
              await this.queue.add(
                WhatsAppJobType.INCOMING_MESSAGE,
                {
                  phoneNumberId,
                  messageId: wamid,
                  from: msg.from,
                  profileName,
                  type: msg.type,
                  textBody,
                  buttonReplyId,
                  listReplyId,
                  flowResponseJson,
                  rawPayload: msg,
                  receivedAt: new Date().toISOString(),
                },
                {
                  jobId: `job_${wamid}`, // Evita duplicar el mismo job en cola
                },
              );

              this.logger.log(`Mensaje encolado en BullMQ: ${wamid} desde ${msg.from}`);
            }
          }

          // B) Procesamiento de Estados de Mensaje (Sent, Delivered, Read, Failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await this.prisma.message.updateMany({
                where: { wamid: status.id },
                data: {
                  status: status.status.toUpperCase() as any,
                  errorDetails: status.errors ? (status.errors as any) : undefined,
                },
              });
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Error procesando payload de webhook:', err);
    }
  }
}
