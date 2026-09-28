import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RazorpayService } from './razorpay.service';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PaymentPurpose, PaymentStatus, RegistrationStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private commission: CommissionService,
    private wallet: WalletService,
    private referrals: ReferralsService,
  ) {}

  async createOrderForContestRegistration(userId: string, contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (Number(contest.entryFee) <= 0) throw new BadRequestException('This contest is free — no payment needed');

    const order = await this.razorpay.createOrder(Number(contest.entryFee), `contest_${contestId}_${userId}`, {
      userId,
      contestId,
      purpose: 'CONTEST_REGISTRATION',
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        purpose: PaymentPurpose.CONTEST_REGISTRATION,
        amount: contest.entryFee,
        status: PaymentStatus.INITIATED,
        razorpayOrderId: order.id,
        contestId,
      },
    });

    return { order, paymentId: payment.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID };
  }

  async createOrderForBookingAdvance(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.customerId !== userId) throw new BadRequestException('Not your booking');

    const order = await this.razorpay.createOrder(Number(booking.advanceAmount), `booking_adv_${bookingId}`, {
      userId,
      bookingId,
      purpose: 'BOOKING_ADVANCE',
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        purpose: PaymentPurpose.BOOKING_ADVANCE,
        amount: booking.advanceAmount,
        status: PaymentStatus.INITIATED,
        razorpayOrderId: order.id,
        bookingId,
      },
    });

    return { order, paymentId: payment.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID };
  }

  /**
   * Handles verified Razorpay webhook events. This is the single source of truth for
   * payment state — the frontend "payment success" callback must NEVER directly
   * mark a Payment as SUCCESSFUL; it only triggers a status re-check.
   */
  async handleWebhookEvent(event: any) {
    const eventType = event.event as string;
    this.logger.log(`Razorpay webhook: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const orderId = event.payload.payment.entity.order_id;
      const razorpayPaymentId = event.payload.payment.entity.id;
      await this.markPaymentSuccessful(orderId, razorpayPaymentId);
    } else if (eventType === 'payment.failed') {
      const orderId = event.payload.payment.entity.order_id;
      await this.prisma.payment.updateMany({
        where: { razorpayOrderId: orderId },
        data: { status: PaymentStatus.FAILED },
      });
    } else if (eventType === 'refund.processed') {
      const paymentId = event.payload.refund.entity.payment_id;
      await this.prisma.payment.updateMany({
        where: { razorpayPaymentId: paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });
    }
  }

  private async markPaymentSuccessful(orderId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) {
      this.logger.warn(`Webhook for unknown order ${orderId}`);
      return;
    }
    if (payment.status === PaymentStatus.SUCCESSFUL) return; // idempotent

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCESSFUL, razorpayPaymentId },
    });

    // A successful payment of any kind is a "qualifying transaction" for referral
    // bonus purposes — checkAndPayoutBonus no-ops if the payer wasn't referred or
    // the bonus was already paid, so this is safe to call unconditionally.
    await this.referrals.checkAndPayoutBonus(payment.userId, Number(payment.amount));

    // Fan out to the relevant module based on purpose
    if (payment.purpose === PaymentPurpose.CONTEST_REGISTRATION && payment.contestId) {
      await this.confirmContestRegistration(payment.userId, payment.contestId, payment.id);
    } else if (payment.purpose === PaymentPurpose.BOOKING_ADVANCE && payment.bookingId) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.ADVANCE_PAID },
      });
    } else if (payment.purpose === PaymentPurpose.BOOKING_BALANCE && payment.bookingId) {
      await this.completeBookingAndPayTalent(payment.bookingId);
    } else if (payment.purpose === PaymentPurpose.SUBSCRIPTION) {
      await this.activateSubscription(payment.userId, payment.id);
    }
  }

  /**
   * Activates a premium subscription on successful payment. Implemented
   * directly here (rather than injecting SubscriptionsService) to avoid a
   * circular module dependency — see subscriptions.module.ts for the full
   * explanation. Mirrors SubscriptionsService.activatePremium exactly.
   */
  private async activateSubscription(userId: string, paymentId: string) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: 'PREMIUM', status: 'ACTIVE', expiresAt, lastPaymentId: paymentId },
      update: { plan: 'PREMIUM', status: 'ACTIVE', expiresAt, lastPaymentId: paymentId },
    });
  }

  private async confirmContestRegistration(userId: string, contestId: string, paymentId: string) {
    await this.prisma.contestRegistration.upsert({
      where: { contestId_userId: { contestId, userId } },
      create: { contestId, userId, paymentId, status: RegistrationStatus.REGISTERED },
      update: { status: RegistrationStatus.REGISTERED, paymentId },
    });

    // Commission is booked at collection time; host payout happens at contest settlement
    // (see contests.service.ts settleContest()) so refunds before the contest ends are clean.
  }

  private async completeBookingAndPayTalent(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { talent: true },
    });

    const pct = await this.commission.resolvePercentage('BOOKING', booking.talent.category, Number(booking.commissionPct));
    const { net } = this.commission.split(Number(booking.amount), pct);

    await this.wallet.credit(booking.talent.userId, net, `booking_${booking.id}`, 'Booking payout (post-commission)');

    await this.prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.COMPLETED } });
  }
}
