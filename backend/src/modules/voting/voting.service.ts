import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

const DAILY_FREE_VOTE_LIMIT = 5; // admin-configurable in production via CommissionRule/settings table

@Injectable()
export class VotingService {
  constructor(private prisma: PrismaService) {}

  /** Casts a free vote with basic anti-fraud checks (rate limit + duplicate detection). */
  async castFreeVote(voterId: string, contestId: string, registrationId: string, deviceFingerprint?: string, ipAddress?: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (!contest.publicVotingEnabled) throw new BadRequestException('Voting is not enabled for this contest');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const votesToday = await this.prisma.vote.count({
      where: { voterId, contestId, createdAt: { gte: todayStart } },
    });
    if (votesToday >= DAILY_FREE_VOTE_LIMIT) {
      throw new BadRequestException(`Daily vote limit (${DAILY_FREE_VOTE_LIMIT}) reached for this contest`);
    }

    // Duplicate-device heuristic: flag but don't silently allow — real deployment should
    // queue this for admin review rather than hard-block, to avoid false positives on shared networks/NAT.
    if (deviceFingerprint) {
      const sameDeviceVotes = await this.prisma.vote.count({
        where: { contestId, deviceFingerprint, createdAt: { gte: todayStart } },
      });
      if (sameDeviceVotes >= DAILY_FREE_VOTE_LIMIT * 3) {
        throw new BadRequestException('Unusual voting activity detected from this device. Please try again later.');
      }
    }

    return this.prisma.vote.create({
      data: { contestId, registrationId, voterId, isPaid: false, deviceFingerprint, ipAddress },
    });
  }

  async contestLeaderboard(contestId: string) {
    return this.prisma.contestRegistration.findMany({
      where: { contestId },
      orderBy: { finalScore: 'desc' },
      include: { user: { select: { name: true, profilePhoto: true } } },
    });
  }
}
