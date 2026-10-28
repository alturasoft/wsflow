import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './modules/queue/queue.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { EngineModule } from './modules/engine/engine.module';
import { FlowsModule } from './modules/flows/flows.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    WhatsAppModule,
    EngineModule,
    FlowsModule,
    ConversationsModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
