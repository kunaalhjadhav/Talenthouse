import { IsString, Length, IsOptional } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Length(10, 15)
  mobile: string;
}

export class VerifyOtpDto {
  @IsString()
  @Length(10, 15)
  mobile: string;

  @IsString()
  @Length(4, 6)
  code: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
