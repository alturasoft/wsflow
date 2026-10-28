import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return {
      status: 'online',
      service: 'WSFlow WhatsApp Multi-Tenant Engine',
      webhookEndpoint: '/webhook/whatsapp',
      timestamp: new Date().toISOString(),
    };
  }
}
