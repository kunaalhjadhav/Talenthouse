import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ContestStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma.service';
import { ContestsService } from '../contests/contests.service';
import { UpdateContestFinancialsDto } from '../contests/dto';
import { CommissionService, CommissionScope } from '../commission/commission.service';
import { AuditionsService } from '../auditions/auditions.service';
import { ReelsService } from '../reels/reels.service';
import { SettingsService } from '../settings/settings.service';
import { BookingsService } from '../bookings/bookings.service';
import { BattlesService } from '../battles/battles.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CONTEST_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService, private contestsService: ContestsService, private commissionService: CommissionService, private auditionsService: AuditionsService, private reelsService: ReelsService, private settings: SettingsService, private bookings: BookingsService, private battles: BattlesService) {}

  @Get('dashboard')
  async dashboard() {
    const [totalUsers, activeContests, totalTalents, totalBookings, pendingContests, pendingAuditions, registrations, paidVotes, tips, bookingRows] = await Promise.all([
      this.prisma.user.count(), this.prisma.contest.count({ where: { status: 'LIVE' } }), this.prisma.talentProfile.count(), this.prisma.booking.count(), this.prisma.contest.count({ where: { status: ContestStatus.SUBMITTED } }),
      this.prisma.audition.count({ where: { status: 'SUBMITTED' as any } }), this.prisma.contestRegistration.count({ where: { status: 'REGISTERED' } }),
      this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL', purpose: 'VOTE_PACK' }, _sum: { amount: true } }), this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL', purpose: 'TIP' }, _sum: { amount: true } }),
      this.prisma.booking.findMany({ where: { status: { in: ['ADVANCE_PAID', 'CONFIRMED', 'PERFORMED', 'COMPLETED'] } }, select: { amount: true, commissionPct: true } }),
    ]);
    const revenueAgg = await this.prisma.payment.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { amount: true } });
    const bookingGmv = bookingRows.reduce((a, b) => a + Number(b.amount), 0);
    const bookingCommission = bookingRows.reduce((a, b) => a + Number(b.amount) * Number(b.commissionPct ?? 0) / 100, 0);
    return { totalUsers, activeContests, totalTalents, totalBookings, pendingContestApprovals: pendingContests, pendingAuditionApprovals: pendingAuditions, registrations, paidVotesRevenue: Number(paidVotes._sum.amount ?? 0), tipsVolume: Number(tips._sum.amount ?? 0), bookingGmv, bookingCommission, grossRevenue: revenueAgg._sum.amount || 0 };
  }

  @Get('settings') getSettings() { return this.settings.all(); }
  @Patch('settings') setSettings(@Body() body: Record<string, unknown>) { return this.settings.setMany(body); }
  @Get('bookings') allBookings() { return this.bookings.allForAdmin(); }
  @Get('battles') listBattles() { return this.battles.list(); }
  @Post('battles') createBattle(@Body() body: any) { return this.battles.create({ title: body?.title, reelAId: body?.reelAId, reelBId: body?.reelBId, endsAt: body?.endsAt }); }
  @Patch('battles/:id/close') closeBattle(@Param('id') id: string) { return this.battles.close(id); }
  @Get('reels/all') allReels() { return this.prisma.reel.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { name: true } } } }); }

  @Get('contests/pending') pendingContests() { return this.prisma.contest.findMany({ where: { status: ContestStatus.SUBMITTED }, orderBy: { createdAt: 'asc' } }); }
  @Get('contests/all') allContests() { return this.prisma.contest.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Patch('contests/:id/approve') approveContest(@Param('id') id: string) { return this.contestsService.adminSetStatus(id, ContestStatus.APPROVED); }
  @Patch('contests/:id/reject') rejectContest(@Param('id') id: string, @Body('reason') reason: string) { return this.contestsService.adminSetStatus(id, ContestStatus.REJECTED, reason); }
  @Patch('contests/:id/financials') updateContestFinancials(@Param('id') id: string, @Body() dto: UpdateContestFinancialsDto) { return this.contestsService.adminUpdateFinancials(id, dto); }

  @Get('commission-rules') listCommissionRules() { return this.commissionService.listRules(); }
  @Patch('commission-rules') upsertCommissionRule(@Body('scope') scope: CommissionScope, @Body('key') key: string, @Body('percentage') percentage: number) { return this.commissionService.upsertRule(scope, key, percentage); }

  @Get('payments') listPayments() { return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }
  @Get('talents/pending') pendingTalents() { return this.prisma.talentProfile.findMany({ where: { verified: false } }); }
  @Patch('talents/:id/verify') verifyTalent(@Param('id') id: string) { return this.prisma.talentProfile.update({ where: { id }, data: { verified: true } }); }

  @Get('auditions/pending') pendingAuditions() { return this.auditionsService.pending(); }
  @Patch('auditions/:id/approve') approveAudition(@Param('id') id: string) { return this.auditionsService.adminSetStatus(id, 'LIVE' as any); }
  @Patch('auditions/:id/reject') rejectAudition(@Param('id') id: string) { return this.auditionsService.adminSetStatus(id, 'REJECTED' as any); }

  @Get('reels/pending') pendingReels() { return this.reelsService.pendingReview(); }
  @Patch('reels/:id/approve') approveReel(@Param('id') id: string) { return this.reelsService.adminModerate(id, 'APPROVE'); }
  @Patch('reels/:id/remove') removeReel(@Param('id') id: string) { return this.reelsService.adminModerate(id, 'REMOVE'); }
}
