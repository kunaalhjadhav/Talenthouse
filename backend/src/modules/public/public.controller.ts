import { Controller, Get, Query } from '@nestjs/common';
import { seedCategoriesIfEmpty } from '../admin/category-defaults';
import { PrismaService } from '../../config/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { BattlesService } from '../battles/battles.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService, private engagement: EngagementService, private battles: BattlesService) {}

  @Get('stats')
  async stats() {
    const live = { in: ['APPROVED', 'LIVE', 'REGISTRATION_CLOSED', 'ONGOING'] as any[] };
    const [registrations, liveContests, prize, verifiedTalents, openAuditions, users] = await Promise.all([
      this.prisma.contestRegistration.count({ where: { status: 'REGISTERED' } }),
      this.prisma.contest.count({ where: { status: live } }),
      this.prisma.contest.aggregate({ where: { status: live }, _sum: { prizePool: true } }),
      this.prisma.talentProfile.count({ where: { verified: true } }),
      this.prisma.audition.count({ where: { status: 'LIVE' as any } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { registrations, liveContests, prizeMoneyLive: Number(prize._sum.prizePool ?? 0), verifiedTalents, openAuditions, users };
  }

  /** Active categories for the apps and website. Optional ?type=CONTEST|REEL|TALENT|AUDITION. */
  @Get('categories')
  async categories(@Query('type') type?: string) {
    await seedCategoriesIfEmpty(this.prisma);
    return this.prisma.category.findMany({ where: { active: true, ...(type ? { type } : {}) }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, type: true, name: true, icon: true, sortOrder: true } });
  }

  @Get('hall-of-fame')
  async hallOfFame() {
    const [topCreators, winners, buzzers, battles] = await Promise.all([
      this.engagement.leaderboard(10),
      this.prisma.contestRegistration.findMany({ where: { rank: 1, contest: { status: 'COMPLETED' } }, include: { user: { select: { name: true, profilePhoto: true } }, contest: { select: { title: true, prizePool: true, category: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.contestRegistration.findMany({ where: { goldenBuzzer: true }, include: { user: { select: { name: true, profilePhoto: true } }, contest: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.battles.list('LIVE'),
    ]);
    return {
      topCreators,
      recentWinners: winners.map((w) => ({ name: w.user.name, photo: w.user.profilePhoto, contest: w.contest.title, category: w.contest.category, prize: Number(w.contest.prizePool) })),
      goldenBuzzers: buzzers.map((b) => ({ name: b.user.name, photo: b.user.profilePhoto, contest: b.contest.title })),
      liveBattle: battles[0] ?? null,
    };
  }
}
