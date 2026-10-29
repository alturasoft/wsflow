import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenantId?: string;
  tenantName?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>('JWT_SECRET') ||
      'super_secret_jwt_key_wsflow_tenant_2026_change_in_production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any): Promise<JwtPayload> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantId: payload.tenantId,
      tenantName: payload.tenantName,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin,
    };
  }
}

