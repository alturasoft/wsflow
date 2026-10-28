import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSignatureGuard } from './whatsapp-signature.guard';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppSignatureGuard],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
