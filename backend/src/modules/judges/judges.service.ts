import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class JudgesService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateProfile(userId: string, data: any) {
    return this.prisma.judgeProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async myProfile(userId: string) {
    return this.prisma.judgeProfile.findUnique({ where: { userId } });
  }

  /** Contests this judge has actually been assigned to (via ContestJudge), any status — powers the judge dashboard. */
  async myAssignedContests(userId: string) {
    const profile = await this.prisma.judgeProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    const assignments = await this.prisma.contestJudge.findMany({
      where: { judgeId: profile.id },
      include: { contest: true },
    });
    return assignments.map((a) => a.contest);
  }

  async earnings(userId: string) {
    const profile = await this.prisma.judgeProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Judge profile not found');

    const assignments = await this.prisma.contestJudge.findMany({
      where: { judgeId: profile.id },
      include: { contest: { select: { title: true, status: true } } },
    });

    const totalEarned = assignments.filter((a) => a.paid).reduce((sum, a) => sum + Number(a.feeAgreed || 0), 0);
    const pending = assignments.filter((a) => !a.paid).reduce((sum, a) => sum + Number(a.feeAgreed || 0), 0);

    return { totalEarned, pending, assignments };
  }
}
