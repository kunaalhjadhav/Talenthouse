import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EngagementService } from '../engagement/engagement.service';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class VotingService {
  constructor(private prisma: PrismaService, private settings: SettingsService, private engagement: EngagementService) {}

  async castFreeVote(voterId: string, contestId: string, registrationId: string, deviceFingerprint?: string, ipAddress?: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (!contest.publicVotingEnabled) throw new BadRequestException('Voting is not enabled for this contest');
    if (!['LIVE', 'ONGOING', 'REGISTRATION_CLOSED'].includes(contest.status)) throw new BadRequestException('Voting is closed for this contest');
    const reg = await this.prisma.contestRegistration.findFirst({ where: { id: registrationId, contestId, status: RegistrationStatus.REGISTERED } });
    if (!reg) throw new BadRequestException('That participant is not in this contest');
    if (reg.userId === voterId) throw new BadRequestException('You cannot vote for yourself');
    const limit = Number(await this.settings.get('dailyFreeVotes'));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const votesToday = await this.prisma.vote.count({ where: { voterId, contestId, isPaid: false, createdAt: { gte: todayStart } } });
    if (votesToday >= limit) throw new BadRequestException(`Daily free vote limit (${limit}) reached for this contest. You can buy more votes.`);
    if (deviceFingerprint) {
      const sameDeviceVotes = await this.prisma.vote.count({ where: { contestId, deviceFingerprint, isPaid: false, createdAt: { gte: todayStart } } });
      if (sameDeviceVotes >= limit * 3) throw new BadRequestException('Unusual voting activity detected from this device.');
    }
    const vote = await this.prisma.vote.create({ data: { contestId, registrationId, voterId, isPaid: false, deviceFingerprint, ipAddress } });
    await this.engagement.awardXp(voterId, 'VOTE');
    return { ...vote, freeVotesLeft: limit - votesToday - 1 };
  }

  /** Leaderboard with live vote counts. Judge feedback and the Golden Buzzer flag are included for display. */
  async contestLeaderboard(contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    const [regs, counts] = await Promise.all([
      this.prisma.contestRegistration.findMany({ where: { contestId, status: RegistrationStatus.REGISTERED }, include: { user: { select: { id: true, name: true, profilePhoto: true } } } }),
      this.prisma.vote.groupBy({ by: ['registrationId'], where: { contestId }, _count: { _all: true } }),
    ]);
    const votes = Object.fromEntries(counts.map((c) => [c.registrationId, c._count._all]));
    const maxVotes = Math.max(1, ...Object.values(votes) as number[]);
    const jw = Number(contest.judgeWeightPct) / 100, vw = Number(contest.voteWeightPct) / 100;
    const live = (r: any) => (r.judgeScore != null || contest.status !== 'LIVE') ? Math.round(((r.judgeScore != null ? Number(r.judgeScore) : 0) * jw + ((votes[r.id] ?? 0) / maxVotes) * 100 * vw) * 100) / 100 : null;
    const rows = regs.map((r) => ({
      id: r.id, userId: r.userId, user: r.user, voteCount: votes[r.id] ?? 0, judgeScore: r.judgeScore != null ? Number(r.judgeScore) : null,
      finalScore: live(r), goldenBuzzer: r.goldenBuzzer, judgeFeedback: r.judgeFeedback, rank: r.rank, performanceUrl: r.performanceUrl,
    }));
    rows.sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1) || b.voteCount - a.voteCount);
    return rows;
  }

  async myFreeVotesLeft(userId: string, contestId: string) {
    const limit = Number(await this.settings.get('dailyFreeVotes'));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const used = await this.prisma.vote.count({ where: { voterId: userId, contestId, isPaid: false, createdAt: { gte: todayStart } } });
    return { limit, left: Math.max(0, limit - used) };
  }
}
