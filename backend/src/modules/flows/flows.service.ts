import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFlows(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    return this.prisma.flow.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createFlow(data: {
    name: string;
    description?: string;
    tenantId?: string;
    triggerKeywords?: string[];
  }) {
    let tenantId = data.tenantId;
    if (!tenantId) {
      const firstTenant = await this.prisma.tenant.findFirst();
      if (!firstTenant) throw new NotFoundException('No se encontró ningún tenant.');
      tenantId = firstTenant.id;
    }

    const firstUser = await this.prisma.user.findFirst();
    if (!firstUser) throw new NotFoundException('No se encontró ningún usuario.');

    const initialDefinition = {
      nodes: [
        {
          id: 'node_start',
          type: 'start',
          position: { x: 250, y: 60 },
          data: { label: 'Inicio del flujo' },
        },
        {
          id: 'node_welcome',
          type: 'message',
          position: { x: 250, y: 220 },
          data: {
            text: `¡Hola {{nombre_cliente}}! Bienvenido a ${data.name}. ¿En qué podemos ayudarte hoy?`,
          },
        },
      ],
      edges: [
        {
          id: 'e_start_welcome',
          source: 'node_start',
          target: 'node_welcome',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2.5 },
        },
      ],
    };

    const flow = await this.prisma.flow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        createdById: firstUser.id,
        triggerKeywords: data.triggerKeywords || [],
        isActive: true,
      },
    });

    const version = await this.prisma.flowVersion.create({
      data: {
        flowId: flow.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        definition: initialDefinition,
        changelog: 'Versión inicial',
        publishedAt: new Date(),
        publishedById: firstUser.id,
      },
    });

    return this.prisma.flow.update({
      where: { id: flow.id },
      data: { activeVersionId: version.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  async getFlowById(id: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        tenant: true,
      },
    });
    if (!flow) throw new NotFoundException('Flujo no encontrado');
    return flow;
  }

  async saveDraft(flowId: string, definition: any) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { status: 'DRAFT' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!flow) throw new NotFoundException('Flujo no encontrado');

    if (flow.versions.length > 0) {
      // Sincronizar triggerKeywords si el nodo start los contiene
      const startNode = definition?.nodes?.find((n: any) => n.type === 'start');
      if (startNode && Array.isArray(startNode.data?.triggerKeywords)) {
        await this.prisma.flow.update({
          where: { id: flowId },
          data: { triggerKeywords: startNode.data.triggerKeywords },
        });
      }

      // Actualizar borrador existente
      return this.prisma.flowVersion.update({
        where: { id: flow.versions[0].id },
        data: { definition, updatedAt: new Date() },
      });
    }

    // Obtener último número de versión
    const lastVersion = await this.prisma.flowVersion.findFirst({
      where: { flowId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNum = (lastVersion?.versionNumber || 0) + 1;

    // Sincronizar triggerKeywords si el nodo start los contiene
    const startNode = definition?.nodes?.find((n: any) => n.type === 'start');
    if (startNode && Array.isArray(startNode.data?.triggerKeywords)) {
      await this.prisma.flow.update({
        where: { id: flowId },
        data: { triggerKeywords: startNode.data.triggerKeywords },
      });
    }

    return this.prisma.flowVersion.create({
      data: {
        flowId,
        versionNumber: nextVersionNum,
        status: 'DRAFT',
        definition,
      },
    });
  }

  async publishVersion(flowId: string, definition?: any, changelog?: string) {
    const flow = await this.prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow) throw new NotFoundException('Flujo no encontrado');

    const lastVersion = await this.prisma.flowVersion.findFirst({
      where: { flowId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;
    const finalDefinition = definition || lastVersion?.definition;

    // Sincronizar triggerKeywords del nodo start hacia la entidad Flow
    if (finalDefinition?.nodes) {
      const startNode = finalDefinition.nodes.find((n: any) => n.type === 'start');
      if (startNode && Array.isArray(startNode.data?.triggerKeywords)) {
        await this.prisma.flow.update({
          where: { id: flowId },
          data: { triggerKeywords: startNode.data.triggerKeywords },
        });
      }
    }

    const newVersion = await this.prisma.flowVersion.create({
      data: {
        flowId,
        versionNumber,
        status: 'PUBLISHED',
        definition: finalDefinition,
        changelog: changelog || `Publicación v${versionNumber}`,
        publishedAt: new Date(),
      },
    });

    // Actualizar puntero de versión activa en el flujo
    await this.prisma.flow.update({
      where: { id: flowId },
      data: { activeVersionId: newVersion.id },
    });

    return newVersion;
  }

  async updateFlow(
    id: string,
    data: {
      name?: string;
      description?: string;
      triggerKeywords?: string[];
      isActive?: boolean;
    },
  ) {
    return this.prisma.flow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerKeywords: data.triggerKeywords,
        isActive: data.isActive,
      },
    });
  }

  async deleteFlow(flowId: string) {
    const flow = await this.prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow) throw new NotFoundException('Flujo no encontrado');

    const totalFlows = await this.prisma.flow.count({ where: { tenantId: flow.tenantId } });
    if (totalFlows <= 1) {
      throw new Error('No se puede eliminar el único flujo activo del sistema.');
    }

    await this.prisma.flow.delete({
      where: { id: flowId },
    });

    return { success: true, deletedFlowId: flowId };
  }

  async setDefaultFlow(flowId: string, tenantId?: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (!flow) throw new NotFoundException('Flujo no encontrado');

    const effectiveTenantId = tenantId || flow.tenantId;

    await this.prisma.whatsAppAccount.updateMany({
      where: { tenantId: effectiveTenantId },
      data: { defaultFlowId: flowId },
    });

    // Asegurar que el flujo tenga activeVersionId si tiene versiones
    if (!flow.activeVersionId && flow.versions.length > 0) {
      const bestVersion =
        flow.versions.find((v) => v.status === 'PUBLISHED') || flow.versions[0];
      await this.prisma.flow.update({
        where: { id: flow.id },
        data: { activeVersionId: bestVersion.id },
      });
    }

    // Limpiar palabras universales de saludo de las palabras clave de los flujos de este tenant
    const universalGreetings = ['hola', 'menu', 'inicio', 'reiniciar', 'reset', 'empezar', 'hi', 'hello'];
    const allFlows = await this.prisma.flow.findMany({ where: { tenantId: effectiveTenantId } });
    for (const f of allFlows) {
      if (Array.isArray(f.triggerKeywords)) {
        const cleaned = (f.triggerKeywords as string[]).filter(
          (k) => !universalGreetings.includes(String(k).trim().toLowerCase()),
        );
        if (cleaned.length !== f.triggerKeywords.length) {
          await this.prisma.flow.update({
            where: { id: f.id },
            data: { triggerKeywords: cleaned },
          });
        }
      }
    }

    return { success: true, defaultFlowId: flowId, flowName: flow.name };
  }
}
