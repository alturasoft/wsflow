import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationType } from '@prisma/client';

@Controller('api/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async list(@Query('tenantId') tenantId?: string) {
    return this.integrationsService.listIntegrations(tenantId);
  }

  @Post()
  async save(
    @Body()
    body: {
      id?: string;
      tenantId: string;
      name: string;
      type: IntegrationType;
      config: any;
      isActive?: boolean;
    },
  ) {
    return this.integrationsService.saveIntegration(body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.integrationsService.deleteIntegration(id);
  }

  @Post(':id/test')
  async test(@Param('id') id: string) {
    return this.integrationsService.testIntegration(id);
  }

  @Post('schedule')
  async schedule(
    @Body()
    body: {
      tenantId: string;
      integrationId?: string;
      summary: string;
      description?: string;
      attendeeEmail: string;
      attendeeName?: string;
      startTime: string;
      durationMinutes?: number;
      generateMeetingLink?: boolean;
    },
  ) {
    return this.integrationsService.executeAppointment(body.tenantId, body.integrationId, body);
  }
}
