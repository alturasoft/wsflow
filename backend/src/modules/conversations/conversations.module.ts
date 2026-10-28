import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EncryptionService } from '../../common/encryption/encryption.service';

@Module({
  imports: [WhatsAppModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, EncryptionService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
