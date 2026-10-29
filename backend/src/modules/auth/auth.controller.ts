import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SwitchTenantDto, RegisterTenantDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de Login Centralizado
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Conmutar de empresa activa (Switch Tenant)
   */
  @Post('switch-tenant')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchTenant(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SwitchTenantDto,
  ) {
    return this.authService.switchTenant(user.sub, dto.tenantId);
  }

  /**
   * Obtener perfil y datos de sesión actual
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub, user.tenantId);
  }

  /**
   * Registrar una nueva empresa con su usuario administrador
   */
  @Post('register-tenant')
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }
}

