import { IsString, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateAuditionDto {
  @IsString() title: string;
  @IsOptional() @IsString() companyName?: string;
  @IsString() category: string;
  @IsString() description: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsNumber() minAge?: number;
  @IsOptional() @IsNumber() maxAge?: number;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() compensation?: string;
  @IsDateString() applicationDeadline: string;
  @IsOptional() @IsDateString() auditionDate?: string;
  @IsOptional() @IsNumber() numOpenings?: number;
}

export class ApplyToAuditionDto {
  @IsOptional() @IsArray() portfolioUrls?: string[];
  @IsOptional() @IsString() resumeUrl?: string;
}
