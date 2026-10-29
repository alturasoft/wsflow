import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class SwitchTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'El tenantId es requerido' })
  tenantId: string;
}

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  companyName: string;

  @IsOptional()
  @IsString()
  companySlug?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del administrador es requerido' })
  adminName: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  adminEmail: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  adminPassword: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @IsOptional()
  @IsString()
  wabaId?: string;
}

