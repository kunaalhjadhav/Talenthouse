import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RatingTargetType } from '@prisma/client';

@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(
    @CurrentUser('id') raterId: string,
    @Body('targetType') targetType: RatingTargetType,
    @Body('targetId') targetId: string,
    @Body('stars') stars: number,
    @Body('review') review?: string,
  ) {
    return this.ratingsService.submit(raterId, targetType, targetId, Number(stars), review);
  }

  @Get(':targetType/:targetId')
  forTarget(@Param('targetType') targetType: RatingTargetType, @Param('targetId') targetId: string) {
    return this.ratingsService.forTarget(targetType, targetId);
  }

  @Get(':targetType/:targetId/average')
  average(@Param('targetType') targetType: RatingTargetType, @Param('targetId') targetId: string) {
    return this.ratingsService.averageFor(targetType, targetId);
  }
}
