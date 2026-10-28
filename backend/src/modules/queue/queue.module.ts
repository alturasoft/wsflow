import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WHATSAPP_QUEUE_NAME } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: WHATSAPP_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
