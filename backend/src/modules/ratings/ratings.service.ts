import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RatingTargetType } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async submit(raterId: string, targetType: RatingTargetType, targetId: string, stars: number, review?: string) {
    if (stars < 1 || stars > 5) throw new BadRequestException('Stars must be between 1 and 5');

    try {
      const rating = await this.prisma.rating.create({
        data: { raterId, targetType, targetId, stars, review },
      });
      await this.recomputeAggregateRating(targetType, targetId);
      return rating;
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('You have already rated this');
      throw e;
    }
  }

  async forTarget(targetType: RatingTargetType, targetId: string) {
    return this.prisma.rating.findMany({
      where: { targetType, targetId, hidden: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async averageFor(targetType: RatingTargetType, targetId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { targetType, targetId, hidden: false },
      _avg: { stars: true },
      _count: true,
    });
    return { average: agg._avg.stars || 0, count: agg._count };
  }

  /** Keeps TalentProfile.rating / JudgeProfile.rating in sync so search/sort by rating stays fast (no live aggregation on every list query). */
  private async recomputeAggregateRating(targetType: RatingTargetType, targetId: string) {
    const { average } = await this.averageFor(targetType, targetId);

    if (targetType === RatingTargetType.TALENT) {
      await this.prisma.talentProfile.updateMany({ where: { userId: targetId }, data: { rating: average } });
    } else if (targetType === RatingTargetType.JUDGE) {
      await this.prisma.judgeProfile.updateMany({ where: { userId: targetId }, data: { rating: average } });
    }
  }

  // ---- Admin moderation ----

  async hide(ratingId: string) {
    return this.prisma.rating.update({ where: { id: ratingId }, data: { hidden: true, moderated: true } });
  }

  async unhide(ratingId: string) {
    return this.prisma.rating.update({ where: { id: ratingId }, data: { hidden: false, moderated: true } });
  }
}
