import { IsString, Length, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';
export class RequestOtpDto { @IsString() @Length(10, 15) mobile: string; @IsOptional() @IsEnum(UserRole) intendedRole?: UserRole; }
export class VerifyOtpDto { @IsString() @Length(10, 15) mobile: string; @IsString() @Length(4, 6) code: string; @IsOptional() @IsString() deviceId?: string; @IsOptional() @IsEnum(UserRole) intendedRole?: UserRole; }
export class RefreshTokenDto { @IsString() refreshToken: string; }
