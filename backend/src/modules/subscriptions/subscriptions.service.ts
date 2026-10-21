import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}
  async myPlan(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { plan: SubscriptionPlan.FREE, status: SubscriptionStatus.ACTIVE };
    if (sub.expiresAt && sub.expiresAt < new Date() && sub.status === SubscriptionStatus.ACTIVE) return this.prisma.subscription.update({ where: { userId }, data: { status: SubscriptionStatus.EXPIRED, plan: SubscriptionPlan.FREE } });
    return sub;
  }
  async cancel(userId: string) { return this.prisma.subscription.update({ where: { userId }, data: { autoRenew: false, status: SubscriptionStatus.CANCELLED } }); }
  /** Premium and Pro both count as paid for ad-free and priority features. */
  async isPaid(userId: string): Promise<boolean> { const sub = await this.myPlan(userId); return sub.plan !== SubscriptionPlan.FREE && sub.status === SubscriptionStatus.ACTIVE; }
}
