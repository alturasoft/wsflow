import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterTenantDto } from './dto/login.dto';
import { TenantRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Inicio de sesión centralizado
   */
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenants: {
          include: {
            tenant: {
              include: {
                whatsappAccounts: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // Obtener los tenants accesibles para este usuario
    let accessibleTenants: any[] = user.tenants
      .filter((tu) => tu.tenant.status === 'ACTIVE')
      .map((tu) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        slug: tu.tenant.slug,
        role: tu.role,
        whatsappAccounts: tu.tenant.whatsappAccounts,
      }));

    // Si es SuperAdmin, también puede acceder a todos los demás tenants del sistema
    if (user.isSuperAdmin) {
      const allTenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        include: { whatsappAccounts: true },
      });
      for (const t of allTenants) {
        if (!accessibleTenants.some((at) => at.id === t.id)) {
          accessibleTenants.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            role: TenantRole.OWNER,
            whatsappAccounts: t.whatsappAccounts,
          });
        }
      }
    }

    if (accessibleTenants.length === 0) {
      throw new ForbiddenException(
        'Tu cuenta no tiene empresas asignadas activas. Contacta al administrador.',
      );
    }

    // Si el usuario especificó a qué tenant ingresar
    if (dto.tenantId) {
      const selectedTenant = accessibleTenants.find((t) => t.id === dto.tenantId);
      if (!selectedTenant) {
        throw new ForbiddenException('No tienes permisos para acceder a esta empresa');
      }
      return this.generateAuthResponse(user, selectedTenant, accessibleTenants);
    }

    // Si el usuario pertenece a una sola empresa, entra automáticamente
    if (accessibleTenants.length === 1) {
      return this.generateAuthResponse(user, accessibleTenants[0], accessibleTenants);
    }

    // Si pertenece a múltiples empresas y no especificó cuál, se le pide seleccionar
    return {
      requiresTenantSelection: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
      },
      tenants: accessibleTenants,
    };
  }

  /**
   * Cambiar de empresa activa una vez autenticado
   */
  async switchTenant(userId: string, targetTenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: {
            tenant: {
              include: { whatsappAccounts: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const membership = user.tenants.find((tu) => tu.tenantId === targetTenantId);
    let selectedTenant: any;

    if (membership) {
      selectedTenant = {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        role: membership.role,
        whatsappAccounts: membership.tenant.whatsappAccounts,
      };
    } else if (user.isSuperAdmin) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: targetTenantId },
        include: { whatsappAccounts: true },
      });
      if (!tenant) throw new NotFoundException('Empresa no encontrada');
      selectedTenant = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: TenantRole.OWNER,
        whatsappAccounts: tenant.whatsappAccounts,
      };
    } else {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const accessibleTenants = await this.getAccessibleTenantsForUser(user);
    return this.generateAuthResponse(user, selectedTenant, accessibleTenants);
  }

  /**
   * Obtiene la información del usuario autenticado y su contexto actual
   */
  async getMe(userId: string, currentTenantId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: {
            tenant: {
              include: { whatsappAccounts: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const accessibleTenants = await this.getAccessibleTenantsForUser(user);
    const activeTenant =
      accessibleTenants.find((t) => t.id === currentTenantId) || accessibleTenants[0] || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isSuperAdmin: user.isSuperAdmin,
      },
      activeTenant,
      tenants: accessibleTenants,
    };
  }

  /**
   * Registrar una nueva empresa (Inquilino) y su usuario administrador
   */
  async registerTenant(dto: RegisterTenantDto) {
    let baseSlug = (dto.companySlug || dto.companyName)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = `empresa-${Date.now().toString(36)}`;
    }

    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear el nuevo Tenant con modo operacional "DEVELOPMENT" o "ACTIVE"
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName.trim(),
          slug,
          status: 'ACTIVE',
          settings: {
            timezone: 'America/La_Paz',
            language: 'es',
            operationalMode: 'DEVELOPMENT', // Por defecto inicia en Desarrollo
          },
        },
      });

      // 2. Crear o asociar el usuario
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            email: adminEmail,
            name: dto.adminName.trim(),
            passwordHash,
          },
        });
      }

      // 3. Vincular como OWNER
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: TenantRole.OWNER,
        },
      });

      // 4. Crear cuenta WABA inicial si se proporcionó número
      const phone = dto.phoneNumber?.trim();
      const phoneId = dto.phoneNumberId?.trim() || (phone ? `phone_id_${Date.now()}` : undefined);

      if (phone && phoneId) {
        await tx.whatsAppAccount.create({
          data: {
            tenantId: tenant.id,
            name: `Línea Principal ${tenant.name}`,
            phoneNumberId: phoneId,
            wabaId: dto.wabaId?.trim() || `waba_${Date.now()}`,
            displayPhoneNumber: phone,
            accessTokenEncrypted: 'TEMP_TOKEN_PENDING_CONFIG',
            webhookVerifyToken: `verify_${slug}_${Date.now()}`,
          },
        });
      }

      // 5. Crear un flujo inicial de bienvenida para este nuevo tenant
      const initialFlow = await tx.flow.create({
        data: {
          tenantId: tenant.id,
          name: `Flujo Principal ${tenant.name}`,
          description: `Flujo inicial configurado para ${tenant.name}`,
          triggerKeywords: ['hola', 'menu', 'inicio'],
          createdById: user.id,
          versions: {
            create: {
              versionNumber: 1,
              status: 'PUBLISHED',
              definition: {
                nodes: [
                  {
                    id: 'node_start',
                    type: 'start',
                    position: { x: 250, y: 50 },
                    data: { label: 'Inicio del flujo', triggerKeywords: ['hola', 'menu', 'inicio'] },
                  },
                  {
                    id: 'node_welcome',
                    type: 'message',
                    position: { x: 250, y: 190 },
                    data: { text: `¡Hola! Bienvenido a ${tenant.name}. ¿En qué podemos ayudarte hoy?` },
                  },
                ],
                edges: [
                  { id: 'e1', source: 'node_start', target: 'node_welcome', animated: true },
                ],
              },
            },
          },
        },
      });

      return { tenant, user, flowId: initialFlow.id };
    });

    this.logger.log(
      `Nuevo inquilino creado: "${result.tenant.name}" (${result.tenant.id}) por ${dto.adminEmail}`,
    );

    // Iniciar sesión inmediatamente
    return this.login({
      email: dto.adminEmail,
      password: dto.adminPassword,
      tenantId: result.tenant.id,
    });
  }

  private async getAccessibleTenantsForUser(user: any) {
    let tenants = user.tenants
      .filter((tu: any) => tu.tenant.status === 'ACTIVE')
      .map((tu: any) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        slug: tu.tenant.slug,
        role: tu.role,
        whatsappAccounts: tu.tenant.whatsappAccounts,
      }));

    if (user.isSuperAdmin) {
      const all = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        include: { whatsappAccounts: true },
      });
      for (const t of all) {
        if (!tenants.some((at: any) => at.id === t.id)) {
          tenants.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            role: TenantRole.OWNER,
            whatsappAccounts: t.whatsappAccounts,
          });
        }
      }
    }
    return tenants;
  }

  private generateAuthResponse(user: any, activeTenant: any, accessibleTenants: any[]) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: activeTenant.id,
      tenantName: activeTenant.name,
      role: activeTenant.role || TenantRole.ADMIN,
      isSuperAdmin: Boolean(user.isSuperAdmin),
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isSuperAdmin: user.isSuperAdmin,
      },
      activeTenant,
      tenants: accessibleTenants,
    };
  }
}

