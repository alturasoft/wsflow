import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { CalendarService } from './calendar.service';
import { EmailService } from './email.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationsController],
  providers: [CalendarService, EmailService, IntegrationsService, EncryptionService],
  exports: [CalendarService, EmailService, IntegrationsService],
})
export class IntegrationsModule {}
