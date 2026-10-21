import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { RazorpayService, devPaymentsEnabled } from './razorpay.service';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { SettingsService } from '../settings/settings.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentPurpose, PaymentStatus, RegistrationStatus, BookingStatus, SubscriptionPlan } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');
  constructor(
    private prisma: PrismaService, private razorpay: RazorpayService, private commission: CommissionService, private wallet: WalletService, private referrals: ReferralsService,
    private settings: SettingsService, private engagement: EngagementService, private notifications: NotificationsService,
  ) {}

  private async order(userId: string, purpose: PaymentPurpose, amount: number, receipt: string, extra: { contestId?: string; bookingId?: string; metadata?: any } = {}) {
    if (!(amount > 0)) throw new BadRequestException('Amount must be greater than zero');
    const order = await this.razorpay.createOrder(amount, receipt, { userId, purpose });
    const payment = await this.prisma.payment.create({ data: { userId, purpose, amount, status: PaymentStatus.INITIATED, razorpayOrderId: order.id, contestId: extra.contestId, bookingId: extra.bookingId, metadata: extra.metadata } });
    return { order, paymentId: payment.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID, devMode: String(order.id).startsWith('order_dev_') };
  }

  /** Creates a Razorpay order for a paid contest. Checks registration deadline and max-participant capacity before issuing the order, so a full/closed contest can't be paid into. */
  async createOrderForContestRegistration(userId: string, contestId: string) {
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId }, include: { _count: { select: { registrations: true } } } });
    if (Number(contest.entryFee) <= 0) throw new BadRequestException('This contest is free, no payment needed');
    if (new Date() > contest.registrationClosesAt) throw new BadRequestException('Registration has closed for this contest');
    if (!['LIVE', 'APPROVED'].includes(contest.status)) throw new BadRequestException('This contest is not open for registration');
    if (contest.maxParticipants && contest._count.registrations >= contest.maxParticipants) throw new BadRequestException('This contest is full');
    const already = await this.prisma.contestRegistration.findUnique({ where: { contestId_userId: { contestId, userId } } });
    if (already?.status === RegistrationStatus.REGISTERED) throw new BadRequestException('You are already registered');
    return this.order(userId, PaymentPurpose.CONTEST_REGISTRATION, Number(contest.entryFee), `contest_${contestId.slice(0, 8)}_${Date.now()}`, { contestId });
  }

  async createOrderForBookingAdvance(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.customerId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== BookingStatus.ACCEPTED) throw new BadRequestException('The talent has to accept this booking before you can pay the advance');
    return this.order(userId, PaymentPurpose.BOOKING_ADVANCE, Number(booking.advanceAmount), `booking_adv_${bookingId.slice(0, 8)}`, { bookingId });
  }

  async createOrderForBookingBalance(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.customerId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== BookingStatus.PERFORMED) throw new BadRequestException('The balance is due after the talent marks the event as performed');
    return this.order(userId, PaymentPurpose.BOOKING_BALANCE, Number(booking.balanceAmount), `booking_bal_${bookingId.slice(0, 8)}`, { bookingId });
  }

  async createOrderForVotePack(userId: string, contestId: string, registrationId: string, count: number) {
    const n = Math.floor(Number(count));
    if (!(n >= 1 && n <= 500)) throw new BadRequestException('Choose between 1 and 500 votes');
    const contest = await this.prisma.contest.findUniqueOrThrow({ where: { id: contestId } });
    if (!contest.publicVotingEnabled) throw new BadRequestException('Voting is not enabled for this contest');
    if (!['LIVE', 'ONGOING', 'REGISTRATION_CLOSED'].includes(contest.status)) throw new BadRequestException('Voting is closed for this contest');
    const reg = await this.prisma.contestRegistration.findFirst({ where: { id: registrationId, contestId, status: RegistrationStatus.REGISTERED } });
    if (!reg) throw new BadRequestException('That participant is not in this contest');
    const unit = contest.votingFee != null ? Number(contest.votingFee) : Number(await this.settings.get('votePrice'));
    return this.order(userId, PaymentPurpose.VOTE_PACK, unit * n, `votes_${contestId.slice(0, 8)}_${Date.now()}`, { contestId, metadata: { registrationId, count: n, unit } });
  }

  async createOrderForTip(userId: string, toUserId: string, amount: number, reelId?: string) {
    const a = Number(amount);
    if (!(a >= 1 && a <= 50000)) throw new BadRequestException('A tip must be between ₹1 and ₹50,000');
    if (toUserId === userId) throw new BadRequestException('You cannot tip yourself');
    await this.prisma.user.findUniqueOrThrow({ where: { id: toUserId } });
    return this.order(userId, PaymentPurpose.TIP, a, `tip_${Date.now()}`, { metadata: { toUserId, reelId: reelId ?? null } });
  }

  async createOrderForSubscription(userId: string, plan: SubscriptionPlan) {
    if (plan !== SubscriptionPlan.PREMIUM && plan !== SubscriptionPlan.PRO) throw new BadRequestException('Choose PREMIUM or PRO');
    const price = Number(await this.settings.get(plan === SubscriptionPlan.PRO ? 'proPrice' : 'premiumPrice'));
    return this.order(userId, PaymentPurpose.SUBSCRIPTION, price, `sub_${plan}_${Date.now()}`, { metadata: { plan } });
  }

  /** Local testing only (ALLOW_DEV_PAYMENTS=true and not production): confirms a dev order the same way the webhook would. */
  async devConfirm(userId: string, paymentId: string) {
    if (!devPaymentsEnabled()) throw new ForbiddenException('Dev payments are disabled');
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.userId !== userId) throw new ForbiddenException('Not your payment');
    if (!payment.razorpayOrderId?.startsWith('order_dev_')) throw new BadRequestException('Only dev orders can be confirmed this way');
    await this.markPaymentSuccessful(payment.razorpayOrderId, `pay_dev_${paymentId.slice(0, 8)}`);
    return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  async myPayment(userId: string, paymentId: string) { const p = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }); if (p.userId !== userId) throw new ForbiddenException('Not your payment'); return { id: p.id, status: p.status, purpose: p.purpose, amount: p.amount }; }

  async handleWebhookEvent(event: any) {
    const eventType = event.event as string;
    this.logger.log(`Razorpay webhook: ${eventType}`);
    if (eventType === 'payment.captured' || eventType === 'order.paid') await this.markPaymentSuccessful(event.payload.payment.entity.order_id, event.payload.payment.entity.id);
    else if (eventType === 'payment.failed') await this.prisma.payment.updateMany({ where: { razorpayOrderId: event.payload.payment.entity.order_id, status: { not: PaymentStatus.SUCCESSFUL } }, data: { status: PaymentStatus.FAILED } });
    else if (eventType === 'refund.processed') await this.prisma.payment.updateMany({ where: { razorpayPaymentId: event.payload.refund.entity.payment_id }, data: { status: PaymentStatus.REFUNDED } });
  }

  private async markPaymentSuccessful(orderId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) { this.logger.warn(`Webhook for unknown order ${orderId}`); return; }
    // Atomic claim: only the first confirmation proceeds, so a repeated webhook can never double-credit.
    const claimed = await this.prisma.payment.updateMany({ where: { id: payment.id, status: { not: PaymentStatus.SUCCESSFUL } }, data: { status: PaymentStatus.SUCCESSFUL, razorpayPaymentId } });
    if (claimed.count === 0) return;
    await this.referrals.checkAndPayoutBonus(payment.userId, Number(payment.amount)).catch((e) => this.logger.warn(`Referral payout skipped: ${e.message}`));
    const meta: any = payment.metadata ?? {};
    switch (payment.purpose) {
      case PaymentPurpose.CONTEST_REGISTRATION: if (payment.contestId) await this.confirmContestRegistration(payment.userId, payment.contestId, payment.id); break;
      case PaymentPurpose.BOOKING_ADVANCE: if (payment.bookingId) await this.confirmBookingAdvance(payment.bookingId); break;
      case PaymentPurpose.BOOKING_BALANCE: if (payment.bookingId) await this.completeBookingAndPayTalent(payment.bookingId); break;
      case PaymentPurpose.SUBSCRIPTION: await this.activateSubscription(payment.userId, payment.id, (meta.plan as SubscriptionPlan) ?? SubscriptionPlan.PREMIUM); break;
      case PaymentPurpose.VOTE_PACK: await this.applyVotePack(payment.userId, payment.contestId!, meta.registrationId, Number(meta.count), Number(meta.unit)); break;
      case PaymentPurpose.TIP: await this.applyTip(payment.userId, meta.toUserId, Number(payment.amount), meta.reelId, payment.id); break;
    }
  }

  private async activateSubscription(userId: string, paymentId: string, plan: SubscriptionPlan) {
    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
    await this.prisma.subscription.upsert({ where: { userId }, create: { userId, plan, status: 'ACTIVE', expiresAt, lastPaymentId: paymentId }, update: { plan, status: 'ACTIVE', expiresAt, lastPaymentId: paymentId } });
    await this.notifications.notify(userId, 'Subscription active', `Your ${plan === 'PRO' ? 'Pro' : 'Premium'} plan is active until ${expiresAt.toLocaleDateString('en-IN')}.`, 'SUBSCRIPTION_ACTIVE', { plan });
  }

  private async confirmContestRegistration(userId: string, contestId: string, paymentId: string) {
    await this.prisma.contestRegistration.upsert({ where: { contestId_userId: { contestId, userId } }, create: { contestId, userId, paymentId, status: RegistrationStatus.REGISTERED }, update: { status: RegistrationStatus.REGISTERED, paymentId } });
    await this.engagement.awardXp(userId, 'REGISTER');
    const contest = await this.prisma.contest.findUnique({ where: { id: contestId } });
    if (contest) {
      await this.notifications.notify(userId, 'Registration confirmed', `You are registered for "${contest.title}". Good luck!`, 'CONTEST_REGISTERED', { contestId });
      await this.notifications.notify(contest.hostId, 'New registration', `A new participant joined "${contest.title}".`, 'CONTEST_NEW_REGISTRATION', { contestId });
    }
  }

  private async confirmBookingAdvance(bookingId: string) {
    const booking = await this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.ADVANCE_PAID }, include: { talent: true } });
    await this.notifications.notify(booking.talent.userId, 'Advance received', 'The customer paid the advance. The booking is confirmed.', 'BOOKING_CONFIRMED', { bookingId });
    await this.notifications.notify(booking.customerId, 'Booking confirmed', 'Your advance was received and the booking is confirmed.', 'BOOKING_CONFIRMED', { bookingId });
  }

  private async applyVotePack(userId: string, contestId: string, registrationId: string, count: number, unit: number) {
    await this.prisma.vote.createMany({ data: Array.from({ length: count }, () => ({ contestId, registrationId, voterId: userId, isPaid: true, amount: unit })) });
    await this.engagement.awardXp(userId, 'VOTE');
  }

  private async applyTip(fromUserId: string, toUserId: string, amount: number, reelId: string | null, paymentId: string) {
    await this.prisma.tip.create({ data: { fromUserId, toUserId, amount, reelId: reelId ?? undefined, paymentId } });
    await this.wallet.credit(toUserId, amount, `tip_${paymentId}`, 'Tip received (100% to you)');
    await this.engagement.awardXp(fromUserId, 'TIP');
    await this.notifications.notify(toUserId, 'You received a tip', `Someone tipped you ₹${amount.toLocaleString('en-IN')}.`, 'TIP_RECEIVED', { reelId });
  }

  private async completeBookingAndPayTalent(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { talent: true } });
    const pct = await this.commission.resolvePercentage('BOOKING', booking.talent.category, booking.commissionPct != null ? Number(booking.commissionPct) : null);
    const { net } = this.commission.split(Number(booking.amount), pct);
    await this.wallet.credit(booking.talent.userId, net, `booking_${booking.id}`, 'Booking payout (after platform commission)');
    await this.prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.COMPLETED } });
    await this.engagement.awardXp(booking.customerId, 'BOOKING');
    const done = await this.prisma.booking.count({ where: { talentId: booking.talentId, status: BookingStatus.COMPLETED } });
    if (done >= 10) await this.engagement.award(booking.talent.userId, 'bookings');
    await this.notifications.notify(booking.talent.userId, 'Payout received', `₹${net.toLocaleString('en-IN')} was added to your wallet.`, 'BOOKING_PAYOUT', { bookingId });
  }
}
