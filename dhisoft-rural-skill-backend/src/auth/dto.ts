import { IsEmail,IsOptional,IsString,IsUUID,MinLength } from 'class-validator';
export class LoginDto { @IsString() tenantSlug!: string; @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; }
export class RefreshDto { @IsOptional() @IsString() refreshToken?: string; }
export class ForgotPasswordDto { @IsEmail() email!: string; @IsString() tenantSlug!: string; }
export class ResetPasswordDto { @IsString() token!: string; @IsString() @MinLength(12) password!: string; }
export class InvitationDto { @IsEmail() email!: string; @IsString() role!: string; }
export class AcceptInvitationDto { @IsString() token!: string; @IsEmail() email!: string; @IsString() @MinLength(12) password!: string; }
