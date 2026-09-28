import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min, IsBoolean, IsArray } from 'class-validator';
import { ContestMode } from '@prisma/client';

export class CreateContestDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsString() category: string;
  @IsOptional() @IsString() subcategory?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsString() promoVideoUrl?: string;
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsNumber() minAge?: number;
  @IsOptional() @IsNumber() maxAge?: number;
  @IsOptional() @IsString() genderEligibility?: string;
  @IsEnum(ContestMode) mode: ContestMode;
  @IsOptional() @IsString() venueAddress?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsDateString() registrationOpensAt: string;
  @IsDateString() registrationClosesAt: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsNumber() @Min(0) entryFee: number;
  @IsOptional() @IsNumber() maxParticipants?: number;
  @IsOptional() @IsNumber() numWinners?: number;
  @IsOptional() @IsNumber() prizePool?: number;
  @IsOptional() @IsBoolean() publicVotingEnabled?: boolean;
  @IsOptional() @IsNumber() votingFee?: number;
}

export class ScoreDto {
  @IsString() criterion: string;
  @IsNumber() score: number;
  @IsOptional() @IsString() comment?: string;
}
