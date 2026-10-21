import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
@Injectable()
export class JudgesService {
  constructor(private prisma: PrismaService) {}
  /** Whitelisted: judges can't verify themselves or mark themselves celebrity. */
  async createOrUpdateProfile(userId: string, data: any) { const clean: any = {}; for (const k of ['category', 'bio', 'baseFee']) if (data?.[k] !== undefined) clean[k] = data[k]; return this.prisma.judgeProfile.upsert({ where: { userId }, create: { userId, ...clean }, update: clean }); }
  async myProfile(userId: string) { return this.prisma.judgeProfile.findUnique({ where: { userId } }); }
  /** NEW: public-ish listing of verified judges, so hosts can browse and assign one to their contest. */
  async listVerified(category?: string) {
    return this.prisma.judgeProfile.findMany({ where: { verified: true, category: category || undefined }, include: { user: { select: { name: true, profilePhoto: true } } }, orderBy: { rating: 'desc' } });
  }
  async myAssignedContests(userId: string) {
    const profile = await this.prisma.judgeProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    const assignments = await this.prisma.contestJudge.findMany({ where: { judgeId: profile.id }, include: { contest: true } });
    return assignments.map((a) => a.contest);
  }
  async earnings(userId: string) {
    const profile = await this.prisma.judgeProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Judge profile not found');
    const assignments = await this.prisma.contestJudge.findMany({ where: { judgeId: profile.id }, include: { contest: { select: { title: true, status: true } } } });
    const totalEarned = assignments.filter((a) => a.paid).reduce((sum, a) => sum + Number(a.feeAgreed || 0), 0);
    const pending = assignments.filter((a) => !a.paid).reduce((sum, a) => sum + Number(a.feeAgreed || 0), 0);
    return { totalEarned, pending, assignments };
  }
}
