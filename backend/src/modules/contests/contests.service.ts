import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContestStatus, UserRole } from '@prisma/client';
import { CreateContestDto } from './dto';

@Injectable()
export class ContestsService {
  constructor(
    private prisma: PrismaService,
    private commission: CommissionService,
    private wallet: WalletService,
    private notifications: NotificationsService,
  ) {}

  async create(hostId: string, dto: CreateContestDto) {
    return this.prisma.contest.create({
      data: {
        ...dto,
        hostId,
        registrationOpensAt: new Date(dto.registrationOpensAt),
        registrationClosesAt: new Date(dto.registrationClosesAt),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: ContestStatus.SUBMITTED, // goes straight to admin review queue
      },
    });
  }

  async findPublished(filters: { category?: string; mode?: string; city?: string }) {
    return this.prisma.contest.findMany({
      where: {
        status: { in: [ContestStatus.LIVE, ContestStatus.REGISTRATION_CLOSED, ContestStatus.ONGOING] },
        category: filters.category,
        mode: filters.mode as any,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /** All contests a host has created, any status — powers the host dashboard (unlike findPublished, which is the public feed). */
  async findByHost(hostId: string) {
    return this.prisma.contest.findMany({
      where: { hostId },
      include: { registrations: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async registrationsForHost(hostId: string, contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (contest.hostId !== hostId) throw new ForbiddenException('Not your contest');

    return this.prisma.contestRegistration.findMany({
      where: { contestId },
      include: { user: { select: { name: true, mobile: true, profilePhoto: true } } },
      orderBy: { finalScore: 'desc' },
    });
  }

  async findOne(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: { registrations: true, judges: { include: { judge: true } }, scoringCriteria: true },
    });
    if (!contest) throw new NotFoundException('Contest not found');
    return contest;
  }

  // ---- Admin moderation workflow ----

  async adminSetStatus(contestId: string, status: ContestStatus, rejectionNote?: string) {
    const contest = await this.prisma.contest.update({
      where: { id: contestId },
      data: { status, rejectionNote },
    });

    if (status === ContestStatus.APPROVED) {
      await this.notifications.notify(contest.hostId, 'Contest approved', `"${contest.title}" is now live for registrations.`, 'CONTEST_APPROVED', { contestId });
    } else if (status === ContestStatus.REJECTED) {
      await this.notifications.notify(contest.hostId, 'Contest needs changes', rejectionNote || `"${contest.title}" was not approved.`, 'CONTEST_REJECTED', { contestId });
    }

    return contest;
  }

  async assignJudge(contestId: string, judgeProfileId: string, feeAgreed?: number) {
    return this.prisma.contestJudge.create({
      data: { contestId, judgeId: judgeProfileId, feeAgreed },
    });
  }

  /** Host-facing wrapper — verifies the caller actually owns this contest before assigning a judge. */
  async assignJudgeAsHost(hostId: string, contestId: string, judgeProfileId: string, feeAgreed?: number) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    // Admins can assign judges to any contest; hosts only to their own.
    const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: hostId } });
    const isAdmin = caller.role === 'ADMIN' || caller.role === 'SUPER_ADMIN';
    if (!isAdmin && contest.hostId !== hostId) throw new ForbiddenException('Not your contest');

    return this.assignJudge(contestId, judgeProfileId, feeAgreed);
  }

  // ---- Scoring ----

  async submitJudgeScore(judgeUserId: string, registrationId: string, criterion: string, score: number, comment?: string) {
    const registration = await this.prisma.contestRegistration.findUniqueOrThrow({
      where: { id: registrationId },
      include: { contest: { include: { judges: { include: { judge: true } } } } },
    });

    const isAssignedJudge = registration.contest.judges.some((j) => j.judge.userId === judgeUserId);
    if (!isAssignedJudge) throw new ForbiddenException('You are not an assigned judge for this contest');

    await this.prisma.judgeScore.create({
      data: { registrationId, judgeUserId, criterion, score, comment },
    });

    return this.recomputeFinalScore(registrationId);
  }

  /** Recomputes weighted final score = judgeWeight% * avg(judge scores) + voteWeight% * normalized votes */
  private async recomputeFinalScore(registrationId: string) {
    const registration = await this.prisma.contestRegistration.findUniqueOrThrow({
      where: { id: registrationId },
      include: { scores: true, contest: true },
    });

    const judgeAvg =
      registration.scores.length > 0
        ? registration.scores.reduce((sum, s) => sum + Number(s.score), 0) / registration.scores.length
        : 0;

    const voteCount = await this.prisma.vote.count({ where: { registrationId } });
    // Simple normalization placeholder: real implementation should normalize against
    // the max vote count across all registrations in the same contest.
    const maxVotes = await this.prisma.vote.groupBy({
      by: ['registrationId'],
      where: { contestId: registration.contestId },
      _count: true,
      orderBy: { _count: { registrationId: 'desc' } },
      take: 1,
    });
    const maxVoteCount = maxVotes[0]?._count || 1;
    const voteScore = (voteCount / maxVoteCount) * 100;

    const judgeWeight = Number(registration.contest.judgeWeightPct) / 100;
    const voteWeight = Number(registration.contest.voteWeightPct) / 100;
    const finalScore = judgeAvg * judgeWeight + voteScore * voteWeight;

    return this.prisma.contestRegistration.update({
      where: { id: registrationId },
      data: { judgeScore: judgeAvg, publicVoteScore: voteScore, finalScore },
    });
  }

  /**
   * Settles a completed contest: ranks participants by finalScore, records awards,
   * takes platform commission out of the gross registration revenue, and credits
   * the host's wallet + winners' prize wallets with the net amounts.
   * Idempotent — safe to re-run (it no-ops if already COMPLETED... in production add a settled flag).
   */
  async settleContest(contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({
      where: { id: contestId },
      include: { registrations: { orderBy: { finalScore: 'desc' } } },
    });

    if (contest.status !== ContestStatus.ONGOING && contest.status !== ContestStatus.REGISTRATION_CLOSED) {
      throw new BadRequestException(`Cannot settle a contest with status ${contest.status}`);
    }

    // Rank + persist
    for (let i = 0; i < contest.registrations.length; i++) {
      await this.prisma.contestRegistration.update({
        where: { id: contest.registrations[i].id },
        data: { rank: i + 1 },
      });
    }

    const grossRevenue = Number(contest.entryFee) * contest.registrations.length;
    const pct = await this.commission.resolvePercentage('CONTEST', contest.category, contest.commissionPct ? Number(contest.commissionPct) : null);
    const { commission, net: hostShare } = this.commission.split(grossRevenue, pct);

    if (hostShare > 0) {
      await this.wallet.credit(contest.hostId, hostShare, `contest_${contest.id}_settlement`, 'Host earnings after platform commission');
    }

    // Distribute prize pool to top N winners (equal split by default — customize per contest.prizeDistribution if added)
    const winners = contest.registrations.slice(0, contest.numWinners);
    if (winners.length > 0 && Number(contest.prizePool) > 0) {
      const perWinner = Number(contest.prizePool) / winners.length;
      for (const w of winners) {
        await this.wallet.credit(w.userId, perWinner, `contest_${contest.id}_prize`, `Prize for rank ${w.rank}`);
        await this.notifications.notify(
          w.userId,
          'You won a prize! 🏆',
          `You placed #${w.rank} in "${contest.title}" and earned ₹${perWinner.toLocaleString('en-IN')}.`,
          'CONTEST_PRIZE',
          { contestId: contest.id, rank: w.rank },
        );
      }
    }

    return this.prisma.contest.update({
      where: { id: contestId },
      data: { status: ContestStatus.COMPLETED },
    });
  }
}
