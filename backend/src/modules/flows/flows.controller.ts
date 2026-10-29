import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('api')
@UseGuards(OptionalJwtAuthGuard)
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('tenants')
  async getTenants(@CurrentUser() user?: JwtPayload) {
    if (user && !user.isSuperAdmin && user.tenantId) {
      return this.prisma.tenant.findMany({
        where: { id: user.tenantId },
        include: {
          whatsappAccounts: true,
        },
      });
    }

    return this.prisma.tenant.findMany({
      include: {
        whatsappAccounts: true,
      },
    });
  }

  @Get('tenants/:id')
  async getTenant(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    if (user && !user.isSuperAdmin && user.tenantId && user.tenantId !== id) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
    return this.prisma.tenant.findUnique({
      where: { id },
      include: { whatsappAccounts: true },
    });
  }

  @Put('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      operationalMode?: 'ACTIVE' | 'DEVELOPMENT' | 'INACTIVE';
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      settings?: any;
      displayPhoneNumber?: string;
      phoneNumberId?: string;
      wabaId?: string;
    },
    @CurrentUser() user?: JwtPayload,
  ) {
    if (user && !user.isSuperAdmin && user.tenantId && user.tenantId !== id) {
      throw new ForbiddenException('No tienes permisos para modificar esta empresa');
    }

    const currentTenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { whatsappAccounts: true },
    });
    if (!currentTenant) throw new NotFoundException('Inquilino no encontrado');

    const currentSettings = (currentTenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(body.settings || {}),
    };
    if (body.operationalMode) {
      updatedSettings.operationalMode = body.operationalMode;
    }

    let tenantStatus = currentTenant.status;
    if (body.status) {
      tenantStatus = body.status as any;
    } else if (body.operationalMode === 'INACTIVE') {
      tenantStatus = 'INACTIVE';
    } else if (body.operationalMode === 'ACTIVE' || body.operationalMode === 'DEVELOPMENT') {
      tenantStatus = 'ACTIVE';
    }

    // Actualizar datos del tenant
    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: body.name?.trim() || currentTenant.name,
        status: tenantStatus,
        settings: updatedSettings,
      },
      include: { whatsappAccounts: true },
    });

    // Actualizar cuenta de WhatsApp si se proveyó
    if (body.displayPhoneNumber) {
      const primaryAccount = updatedTenant.whatsappAccounts[0];
      if (primaryAccount) {
        await this.prisma.whatsAppAccount.update({
          where: { id: primaryAccount.id },
          data: {
            displayPhoneNumber: body.displayPhoneNumber.trim(),
            ...(body.phoneNumberId ? { phoneNumberId: body.phoneNumberId.trim() } : {}),
            ...(body.wabaId ? { wabaId: body.wabaId.trim() } : {}),
          },
        });
      } else {
        await this.prisma.whatsAppAccount.create({
          data: {
            tenantId: id,
            name: `Línea Principal ${updatedTenant.name}`,
            displayPhoneNumber: body.displayPhoneNumber.trim(),
            phoneNumberId: body.phoneNumberId?.trim() || `phone_${Date.now()}`,
            wabaId: body.wabaId?.trim() || `waba_${Date.now()}`,
            accessTokenEncrypted: 'TEMP_TOKEN_PENDING_CONFIG',
            webhookVerifyToken: `verify_${updatedTenant.slug}_${Date.now()}`,
          },
        });
      }
    }

    return this.prisma.tenant.findUnique({
      where: { id },
      include: { whatsappAccounts: true },
    });
  }

  @Patch('tenants/:id/status')
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() body: { operationalMode: 'ACTIVE' | 'DEVELOPMENT' | 'INACTIVE' },
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.updateTenant(id, { operationalMode: body.operationalMode }, user);
  }

  @Get('flows')
  async listFlows(
    @Query('tenantId') queryTenantId?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    // Si el usuario está autenticado y no es superadmin, forzamos su propio tenant
    const effectiveTenantId =
      user && !user.isSuperAdmin && user.tenantId ? user.tenantId : queryTenantId;
    return this.flowsService.listFlows(effectiveTenantId);
  }

  @Post('flows')
  async createFlow(
    @Body()
    body: {
      name: string;
      description?: string;
      tenantId?: string;
      triggerKeywords?: string[];
    },
    @CurrentUser() user?: JwtPayload,
  ) {
    const effectiveTenantId =
      user && !user.isSuperAdmin && user.tenantId ? user.tenantId : body.tenantId;

    return this.flowsService.createFlow({
      ...body,
      tenantId: effectiveTenantId,
    });
  }

  @Get('flows/:id')
  async getFlow(@Param('id') id: string) {
    return this.flowsService.getFlowById(id);
  }

  @Delete('flows/:id')
  async deleteFlow(@Param('id') id: string) {
    return this.flowsService.deleteFlow(id);
  }

  @Put('flows/:id')
  async updateFlow(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      triggerKeywords?: string[];
      isActive?: boolean;
    },
  ) {
    return this.flowsService.updateFlow(id, body);
  }

  @Put('flows/:id/set-default')
  async setDefaultFlow(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.flowsService.setDefaultFlow(id, tenantId);
  }

  @Put('flows/:id/draft')
  async saveDraft(@Param('id') id: string, @Body() body: { definition: any }) {
    return this.flowsService.saveDraft(id, body.definition);
  }

  @Post('flows/:id/publish')
  async publishFlow(
    @Param('id') id: string,
    @Body() body: { definition?: any; changelog?: string },
  ) {
    return this.flowsService.publishVersion(id, body.definition, body.changelog);
  }

  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const [totalConversations, activeSessions, handedOffSessions, totalMessages] =
      await Promise.all([
        this.prisma.conversation.count({ where }),
        this.prisma.conversation.count({ where: { ...where, status: 'BOT_ACTIVE' } }),
        this.prisma.conversation.count({ where: { ...where, status: 'HANDED_OFF' } }),
        this.prisma.message.count({ where }),
      ]);

    return {
      totalConversations,
      activeSessions,
      handedOffSessions,
      totalMessages,
    };
  }
}
