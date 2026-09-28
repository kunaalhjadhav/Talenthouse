import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const PREMIUM_MONTHLY_PRICE = 199; // ₹ — admin-configurable in production; kept as a default constant here

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  async myPlan(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { plan: SubscriptionPlan.FREE, status: SubscriptionStatus.ACTIVE };

    // Lazily expire — cheaper than a cron for MVP volume; a scheduled sweep can
    // be added via @nestjs/schedule (already a dependency) once volume justifies it.
    if (sub.expiresAt && sub.expiresAt < new Date() && sub.status === SubscriptionStatus.ACTIVE) {
      return this.prisma.subscription.update({ where: { userId }, data: { status: SubscriptionStatus.EXPIRED, plan: SubscriptionPlan.FREE } });
    }
    return sub;
  }

  /** Creates a Razorpay order for the premium subscription. Actual activation happens in the payment webhook, same pattern as contest/booking payments. */
  async createUpgradeOrder(userId: string) {
    const order = await this.razorpay.createOrder(PREMIUM_MONTHLY_PRICE, `subscription_${userId}_${Date.now()}`, {
      userId,
      purpose: 'SUBSCRIPTION',
    });
    return { order, razorpayKeyId: process.env.RAZORPAY_KEY_ID, amount: PREMIUM_MONTHLY_PRICE };
  }

  async activatePremium(userId: string, paymentId: string) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: SubscriptionPlan.PREMIUM, status: SubscriptionStatus.ACTIVE, expiresAt, lastPaymentId: paymentId },
      update: { plan: SubscriptionPlan.PREMIUM, status: SubscriptionStatus.ACTIVE, expiresAt, lastPaymentId: paymentId },
    });
  }

  async cancel(userId: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { autoRenew: false, status: SubscriptionStatus.CANCELLED },
    });
  }

  async isPremium(userId: string): Promise<boolean> {
    const sub = await this.myPlan(userId);
    return sub.plan === SubscriptionPlan.PREMIUM && sub.status === SubscriptionStatus.ACTIVE;
  }
}
