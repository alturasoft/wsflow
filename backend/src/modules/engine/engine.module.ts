import { Module } from '@nestjs/common';
import { DagEngineService } from './dag-engine.service';
import { WhatsAppEventsProcessor } from '../queue/whatsapp-events.processor';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EncryptionService } from '../../common/encryption/encryption.service';

import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [WhatsAppModule, IntegrationsModule],
  providers: [DagEngineService, WhatsAppEventsProcessor, EncryptionService],
  exports: [DagEngineService, EncryptionService],
})
export class EngineModule {}
