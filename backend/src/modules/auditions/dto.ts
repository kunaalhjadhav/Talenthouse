import { IsString, IsOptional, IsNumber } from 'class-validator';
export class CreateAuditionDto {
  @IsString() title: string;
  @IsOptional() @IsString() companyName?: string;
  @IsString() category: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() posterUrl?: string;
  @IsString() description: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsNumber() minAge?: number;
  @IsOptional() @IsNumber() maxAge?: number;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() compensation?: string;
  @IsString() applicationDeadline: string;
  @IsOptional() @IsString() auditionDate?: string;
  @IsOptional() @IsNumber() numOpenings?: number;
}
