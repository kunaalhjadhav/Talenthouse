import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { SetRoleDto } from '../users/dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ContestStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma.service';
import { ContestsService } from '../contests/contests.service';
import { CommissionService, CommissionScope } from '../commission/commission.service';
import { AuditionsService } from '../auditions/auditions.service';
import { ReelsService } from '../reels/reels.service';

/** All routes here require an admin-tier role. This backs the Admin Dashboard app. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CONTEST_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private contestsService: ContestsService,
    private commissionService: CommissionService,
    private auditionsService: AuditionsService,
    private reelsService: ReelsService,
    private usersService: UsersService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [totalUsers, activeContests, totalTalents, totalBookings, pendingContests] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.contest.count({ where: { status: 'LIVE' } }),
      this.prisma.talentProfile.count(),
      this.prisma.booking.count(),
      this.prisma.contest.count({ where: { status: 'SUBMITTED' } }),
    ]);

    const revenueAgg = await this.prisma.payment.aggregate({
      where: { status: 'SUCCESSFUL' },
      _sum: { amount: true },
    });

    return {
      totalUsers,
      activeContests,
      totalTalents,
      totalBookings,
      pendingContestApprovals: pendingContests,
      grossRevenue: revenueAgg._sum.amount || 0,
    };
  }

  @Get('contests/pending')
  pendingContests() {
    return this.prisma.contest.findMany({ where: { status: ContestStatus.SUBMITTED }, orderBy: { createdAt: 'asc' } });
  }

  @Patch('contests/:id/approve')
  approveContest(@Param('id') id: string) {
    return this.contestsService.adminSetStatus(id, ContestStatus.APPROVED);
  }

  @Patch('contests/:id/reject')
  rejectContest(@Param('id') id: string, @Body('reason') reason: string) {
    return this.contestsService.adminSetStatus(id, ContestStatus.REJECTED, reason);
  }

  @Get('commission-rules')
  listCommissionRules() {
    return this.commissionService.listRules();
  }

  @Patch('commission-rules')
  upsertCommissionRule(
    @Body('scope') scope: CommissionScope,
    @Body('key') key: string,
    @Body('percentage') percentage: number,
  ) {
    return this.commissionService.upsertRule(scope, key, percentage);
  }

  @Get('payments')
  listPayments() {
    return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  @Get('talents/pending')
  pendingTalents() {
    return this.prisma.talentProfile.findMany({ where: { verified: false } });
  }

  @Patch('talents/:id/verify')
  verifyTalent(@Param('id') id: string) {
    return this.prisma.talentProfile.update({ where: { id }, data: { verified: true } });
  }

  // ---- Auditions moderation ----

  @Get('auditions/pending')
  pendingAuditions() {
    return this.auditionsService.pending();
  }

  @Patch('auditions/:id/approve')
  approveAudition(@Param('id') id: string) {
    return this.auditionsService.adminSetStatus(id, 'LIVE' as any);
  }

  @Patch('auditions/:id/reject')
  rejectAudition(@Param('id') id: string) {
    return this.auditionsService.adminSetStatus(id, 'REJECTED' as any);
  }

  // ---- Reels moderation ----

  @Get('reels/pending')
  pendingReels() {
    return this.reelsService.pendingReview();
  }

  @Patch('reels/:id/approve')
  approveReel(@Param('id') id: string) {
    return this.reelsService.adminModerate(id, 'APPROVE');
  }

  @Patch('reels/:id/remove')
  removeReel(@Param('id') id: string) {
    return this.reelsService.adminModerate(id, 'REMOVE');
  }

  /** Super-admin only. This is the supported way to grant HOST, JUDGE, RECRUITER, TALENT, or an admin tier. */
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('users/:id/role')
  setUserRole(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() body: SetRoleDto) {
    return this.usersService.setRole(adminId, id, body.role);
  }
}
