import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateReelDto {
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() muxUploadId?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsString() category: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsArray() hashtags?: string[];
}
