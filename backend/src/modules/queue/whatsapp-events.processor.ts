import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WHATSAPP_QUEUE_NAME, WhatsAppEventJobData } from './queue.constants';
import { DagEngineService } from '../engine/dag-engine.service';

@Processor(WHATSAPP_QUEUE_NAME)
export class WhatsAppEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppEventsProcessor.name);

  constructor(private readonly engine: DagEngineService) {
    super();
  }

  async process(job: Job<WhatsAppEventJobData>): Promise<any> {
    const data = job.data;
    this.logger.log(`Procesando mensaje encolado wamid: ${data.messageId} de ${data.from}`);

    try {
      await this.engine.processIncomingMessage({
        phoneNumberId: data.phoneNumberId,
        from: data.from,
        profileName: data.profileName,
        textBody: data.textBody,
        buttonReplyId: data.buttonReplyId,
        listReplyId: data.listReplyId,
        flowResponseJson: data.flowResponseJson,
      });

      return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(`Error procesando mensaje ${data.messageId}:`, error);
      throw error; // Permite reintento automático de BullMQ
    }
  }
}
