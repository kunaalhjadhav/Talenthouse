import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { EngagementService } from '../engagement/engagement.service';
import { ContestStatus, RegistrationStatus } from '@prisma/client';
import { CreateContestDto, UpdateContestFinancialsDto } from './dto';
import { prizeShares } from './prize';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ContestsService {
  constructor(
    private prisma: PrismaService, private commission: CommissionService, private wallet: WalletService, private notifications: NotificationsService,
    private settings: SettingsService, private engagement: EngagementService,
  ) {}

  async create(hostId: string, dto: CreateContestDto) {
    const s = await this.settings.all();
    const opens = new Date(dto.registrationOpensAt), closes = new Date(dto.registrationClosesAt), start = new Date(dto.startDate), end = new Date(dto.endDate);
    if (closes <= opens) throw new BadRequestException('Registration must close after it opens');
    if (end < start) throw new BadRequestException('The end date must be after the start date');
    return this.prisma.contest.create({ data: { ...dto, hostId, registrationOpensAt: opens, registrationClosesAt: closes, startDate: start, endDate: end, judgeWeightPct: s.judgeWeight, voteWeightPct: s.publicWeight, status: ContestStatus.SUBMITTED } });
  }

  /** Public list: includes a flattened registeredCount so the UIs can show "X / max registered". Only fully paid/confirmed registrations count. */
  async findPublished(filters: { category?: string; mode?: string; city?: string }) {
    const contests = await this.prisma.contest.findMany({
      where: { status: { in: [ContestStatus.APPROVED, ContestStatus.LIVE, ContestStatus.REGISTRATION_CLOSED, ContestStatus.ONGOING, ContestStatus.COMPLETED] }, category: filters.category, mode: filters.mode as any },
      orderBy: { startDate: 'asc' },
      include: { _count: { select: { registrations: { where: { status: RegistrationStatus.REGISTERED } } } } },
    });
    return contests.map((c) => ({ ...c, registeredCount: c._count.registrations }));
  }

  async findByHost(hostId: string) { return this.prisma.contest.findMany({ where: { hostId }, include: { registrations: { where: { status: RegistrationStatus.REGISTERED } }, judges: { include: { judge: true } } }, orderBy: { createdAt: 'desc' } }); }

  async registrationsForHost(hostId: string, contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (contest.hostId !== hostId) throw new ForbiddenException('Not your contest');
    return this.prisma.contestRegistration.findMany({ where: { contestId, status: RegistrationStatus.REGISTERED }, include: { user: { select: { name: true, mobile: true, profilePhoto: true } } }, orderBy: { finalScore: 'desc' } });
  }

  async findOne(id: string) {
    const contest = await this.prisma.contest.findUnique({ where: { id }, include: { registrations: { where: { status: RegistrationStatus.REGISTERED }, select: { id: true, userId: true } }, judges: { include: { judge: { include: { user: { select: { name: true, profilePhoto: true } } } } } }, scoringCriteria: true } });
    if (!contest) throw new NotFoundException('Contest not found');
    return { ...contest, registeredCount: contest.registrations.length, prizeShares: prizeShares(contest.numWinners) };
  }

  async adminSetStatus(contestId: string, status: ContestStatus, rejectionNote?: string) {
    const existing = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    // Approved contests go live straight away once their registration window has opened. The scheduler promotes the rest.
    const finalStatus = status === ContestStatus.APPROVED && existing.registrationOpensAt <= new Date() && existing.registrationClosesAt > new Date() ? ContestStatus.LIVE : status;
    const contest = await this.prisma.contest.update({ where: { id: contestId }, data: { status: finalStatus, rejectionNote } });
    if (status === ContestStatus.APPROVED) await this.notifications.notify(contest.hostId, 'Contest approved', `"${contest.title}" is approved${finalStatus === ContestStatus.LIVE ? ' and now live for registrations' : ` and opens for registrations on ${contest.registrationOpensAt.toLocaleDateString('en-IN')}`}.`, 'CONTEST_APPROVED', { contestId });
    else if (status === ContestStatus.REJECTED) await this.notifications.notify(contest.hostId, 'Contest needs changes', rejectionNote || `"${contest.title}" was not approved.`, 'CONTEST_REJECTED', { contestId });
    return contest;
  }

  /** Admin-only: set/adjust prize pool, entry fee, winner count, and a per-contest commission override. */
  async adminUpdateFinancials(contestId: string, dto: UpdateContestFinancialsDto) {
    return this.prisma.contest.update({ where: { id: contestId }, data: { entryFee: dto.entryFee, prizePool: dto.prizePool, numWinners: dto.numWinners, commissionPct: dto.commissionPct } });
  }

  async assignJudge(contestId: string, judgeProfileId: string, feeAgreed?: number) {
    const existing = await this.prisma.contestJudge.findUnique({ where: { contestId_judgeId: { contestId, judgeId: judgeProfileId } } });
    if (existing) throw new ConflictException('This judge is already assigned to the contest');
    const judge = await this.prisma.judgeProfile.findUniqueOrThrow({ where: { id: judgeProfileId } });
    const created = await this.prisma.contestJudge.create({ data: { contestId, judgeId: judgeProfileId, feeAgreed: feeAgreed ?? (judge.baseFee != null ? Number(judge.baseFee) : undefined) } });
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    await this.notifications.notify(judge.userId, 'You were assigned as a judge', `You are judging "${contest.title}".`, 'JUDGE_ASSIGNED', { contestId });
    return created;
  }

  async assignJudgeAsHost(hostId: string, contestId: string, judgeProfileId: string, feeAgreed?: number) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: hostId } });
    const isAdmin = caller.role === 'ADMIN' || caller.role === 'SUPER_ADMIN';
    if (!isAdmin && contest.hostId !== hostId) throw new ForbiddenException('Not your contest');
    return this.assignJudge(contestId, judgeProfileId, feeAgreed);
  }

  /** Direct registration path for FREE contests (entryFee = 0). Paid contests register via the payment webhook, so payment can't be skipped. */
  async registerFree(userId: string, contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId }, include: { _count: { select: { registrations: { where: { status: RegistrationStatus.REGISTERED } } } } } });
    if (Number(contest.entryFee) > 0) throw new BadRequestException('This contest requires payment. Use the payment flow instead.');
    if (!['LIVE', 'APPROVED'].includes(contest.status)) throw new BadRequestException('This contest is not open for registration');
    if (new Date() > contest.registrationClosesAt) throw new BadRequestException('Registration has closed for this contest');
    const already = await this.prisma.contestRegistration.findUnique({ where: { contestId_userId: { contestId, userId } } });
    if (already?.status === RegistrationStatus.REGISTERED) throw new ConflictException('You are already registered');
    if (contest.maxParticipants && contest._count.registrations >= contest.maxParticipants) throw new BadRequestException('This contest is full');
    const reg = await this.prisma.contestRegistration.upsert({ where: { contestId_userId: { contestId, userId } }, create: { contestId, userId, status: RegistrationStatus.REGISTERED }, update: { status: RegistrationStatus.REGISTERED } });
    await this.engagement.awardXp(userId, 'REGISTER');
    await this.notifications.notify(contest.hostId, 'New registration', `A new participant joined "${contest.title}".`, 'CONTEST_NEW_REGISTRATION', { contestId });
    return reg;
  }

  private async assertAssignedJudge(judgeUserId: string, registrationId: string) {
    const registration = await this.prisma.contestRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { contest: { include: { judges: { include: { judge: true } }, scoringCriteria: true } } } });
    if (!registration.contest.judges.some((j) => j.judge.userId === judgeUserId)) throw new ForbiddenException('You are not an assigned judge for this contest');
    return registration;
  }

  async submitJudgeScore(judgeUserId: string, registrationId: string, criterion: string, score: number, comment?: string) {
    if (!(score >= 0 && score <= 100)) throw new BadRequestException('Scores are between 0 and 100');
    const registration = await this.assertAssignedJudge(judgeUserId, registrationId);
    // One score per judge per criterion: re-scoring replaces the earlier value.
    await this.prisma.judgeScore.deleteMany({ where: { registrationId, judgeUserId, criterion } });
    await this.prisma.judgeScore.create({ data: { registrationId, judgeUserId, criterion, score, comment } });
    await this.recomputeAll(registration.contestId);
    return this.prisma.contestRegistration.findUniqueOrThrow({ where: { id: registrationId } });
  }

  async submitJudgeFeedback(judgeUserId: string, registrationId: string, feedback: string) {
    const registration = await this.assertAssignedJudge(judgeUserId, registrationId);
    const text = (feedback || '').trim().slice(0, 600);
    const updated = await this.prisma.contestRegistration.update({ where: { id: registrationId }, data: { judgeFeedback: text || null } });
    if (text) await this.notifications.notify(registration.userId, 'Judge feedback', `A judge left feedback on your "${registration.contest.title}" entry.`, 'JUDGE_FEEDBACK', { contestId: registration.contestId });
    return updated;
  }

  /** One Golden Buzzer per judge per contest. It sends an act straight to the finals and earns the Golden Buzzer badge. */
  async goldenBuzzer(judgeUserId: string, registrationId: string) {
    const registration = await this.assertAssignedJudge(judgeUserId, registrationId);
    try { await this.prisma.contestBuzzer.create({ data: { contestId: registration.contestId, judgeUserId, registrationId } }); }
    catch { throw new ConflictException('You have already used your Golden Buzzer in this contest'); }
    const updated = await this.prisma.contestRegistration.update({ where: { id: registrationId }, data: { goldenBuzzer: true } });
    await this.engagement.award(registration.userId, 'golden');
    await this.notifications.notify(registration.userId, 'Golden Buzzer!', `A judge sent you straight to the finals of "${registration.contest.title}".`, 'GOLDEN_BUZZER', { contestId: registration.contestId });
    return updated;
  }

  async judgeState(judgeUserId: string, contestId: string) {
    const [buzz, scores] = await Promise.all([
      this.prisma.contestBuzzer.findUnique({ where: { contestId_judgeUserId: { contestId, judgeUserId } } }),
      this.prisma.judgeScore.findMany({ where: { judgeUserId, registration: { contestId } } }),
    ]);
    const mine: Record<string, Record<string, number>> = {};
    for (const s of scores) (mine[s.registrationId] ||= {})[s.criterion] = Number(s.score);
    return { buzzUsed: !!buzz, buzzRegistrationId: buzz?.registrationId ?? null, myScores: mine };
  }

  /** Weighted judge average (criterion weights if the contest defines them, otherwise equal) blended with the public vote share. */
  async recomputeAll(contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId }, include: { scoringCriteria: true } });
    const regs = await this.prisma.contestRegistration.findMany({ where: { contestId, status: RegistrationStatus.REGISTERED }, include: { scores: true } });
    const counts = await this.prisma.vote.groupBy({ by: ['registrationId'], where: { contestId }, _count: { _all: true } });
    const votes = Object.fromEntries(counts.map((c) => [c.registrationId, c._count._all]));
    const maxVotes = Math.max(1, ...Object.values(votes));
    const weights = Object.fromEntries(contest.scoringCriteria.map((c) => [c.name, Number(c.weightPct)]));
    const jw = Number(contest.judgeWeightPct) / 100, vw = Number(contest.voteWeightPct) / 100;
    for (const r of regs) {
      const byCrit: Record<string, number[]> = {};
      for (const s of r.scores) (byCrit[s.criterion] ||= []).push(Number(s.score));
      let num = 0, den = 0;
      for (const [crit, list] of Object.entries(byCrit)) { const avg = list.reduce((a, b) => a + b, 0) / list.length; const w = weights[crit] ?? 1; num += avg * w; den += w; }
      const judgeAvg = den ? num / den : 0;
      const voteScore = ((votes[r.id] ?? 0) / maxVotes) * 100;
      await this.prisma.contestRegistration.update({ where: { id: r.id }, data: { judgeScore: round2(judgeAvg), publicVoteScore: round2(voteScore), finalScore: round2(judgeAvg * jw + voteScore * vw) } });
    }
  }

  async settleContest(contestId: string, callerId?: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId }, include: { judges: { include: { judge: true } } } });
    if (callerId) { const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: callerId } }); if (!['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(caller.role) && contest.hostId !== callerId) throw new ForbiddenException('Not your contest'); }
    // Atomic claim so a double tap can never pay out twice.
    const claimed = await this.prisma.contest.updateMany({ where: { id: contestId, status: { in: [ContestStatus.LIVE, ContestStatus.REGISTRATION_CLOSED, ContestStatus.ONGOING] } }, data: { status: ContestStatus.COMPLETED } });
    if (claimed.count === 0) throw new BadRequestException(`Cannot settle a contest with status ${contest.status}`);
    await this.recomputeAll(contestId);
    const regs = await this.prisma.contestRegistration.findMany({ where: { contestId, status: RegistrationStatus.REGISTERED }, orderBy: { finalScore: 'desc' } });
    for (let i = 0; i < regs.length; i++) await this.prisma.contestRegistration.update({ where: { id: regs[i].id }, data: { rank: i + 1 } });

    const gross = Number(contest.entryFee) * regs.length;
    const pct = await this.commission.resolvePercentage('CONTEST', contest.category, contest.commissionPct ? Number(contest.commissionPct) : null);
    const { net } = this.commission.split(gross, pct);
    let judgeFees = 0;
    for (const cj of contest.judges) {
      const fee = Number(cj.feeAgreed ?? 0);
      if (fee > 0 && !cj.paid) {
        await this.wallet.credit(cj.judge.userId, fee, `contest_${contest.id}_judge_${cj.id}`, `Judging fee: ${contest.title}`);
        await this.prisma.contestJudge.update({ where: { id: cj.id }, data: { paid: true } });
        judgeFees += fee;
      }
    }
    const hostShare = Math.max(0, round2(net - judgeFees));
    if (hostShare > 0) await this.wallet.credit(contest.hostId, hostShare, `contest_${contest.id}_settlement`, 'Host earnings after platform commission and judge fees');

    const winners = regs.slice(0, contest.numWinners);
    const shares = prizeShares(contest.numWinners);
    if (winners.length > 0 && Number(contest.prizePool) > 0) {
      for (let i = 0; i < winners.length; i++) {
        const amount = round2(Number(contest.prizePool) * shares[i]);
        if (amount <= 0) continue;
        await this.wallet.credit(winners[i].userId, amount, `contest_${contest.id}_prize_${i + 1}`, `Prize for rank ${i + 1}: ${contest.title}`);
        await this.notifications.notify(winners[i].userId, 'You won a prize!', `You placed #${i + 1} in "${contest.title}" and earned ₹${amount.toLocaleString('en-IN')}.`, 'CONTEST_PRIZE', { contestId: contest.id, rank: i + 1 });
      }
    }
    if (winners[0]) await this.engagement.award(winners[0].userId, 'winner');
    return this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
  }
}
