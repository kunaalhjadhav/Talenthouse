import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

const REFERRAL_BONUS_AMOUNT = 100; // ₹ — admin-configurable in production via a settings table, kept as a constant default here (mirrors CommissionService's pattern for its last-resort defaults)
const MIN_QUALIFYING_TRANSACTION = 200; // referee must transact at least this much before the bonus pays out, to deter fake-referral abuse

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private notifications: NotificationsService,
  ) {}

  private generateCode(userId: string): string {
    return `REF${userId.slice(0, 6).toUpperCase()}`;
  }

  async myCode(userId: string) {
    return { code: this.generateCode(userId) };
  }

  /** Called at signup time when a new user enters a referral code. */
  async recordReferral(refereeId: string, code: string) {
    const referrerId = await this.resolveReferrerFromCode(code);
    if (!referrerId) throw new BadRequestException('Invalid referral code');
    if (referrerId === refereeId) throw new BadRequestException('You cannot refer yourself');

    try {
      return await this.prisma.referral.create({
        data: { referrerId, refereeId, code, bonusAmount: REFERRAL_BONUS_AMOUNT },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('This account has already been referred');
      throw e;
    }
  }

  private async resolveReferrerFromCode(code: string): Promise<string | null> {
    // Codes are deterministically derived from userId (see generateCode) — reverse
    // lookup by matching the prefix against real users. A dedicated `code` column
    // with a unique index is cleaner at scale; kept simple here since referral
    // volume is typically small relative to total users.
    const prefix = code.replace(/^REF/, '').toLowerCase();
    const candidates = await this.prisma.user.findMany({
      where: { id: { startsWith: prefix } },
      select: { id: true },
      take: 5,
    });
    return candidates[0]?.id || null;
  }

  /**
   * Call this whenever the referee completes a transaction that should count
   * toward unlocking the referral bonus (e.g. a successful Payment webhook).
   * Idempotent — only pays out once per referral.
   */
  async checkAndPayoutBonus(refereeId: string, transactionAmount: number) {
    if (transactionAmount < MIN_QUALIFYING_TRANSACTION) return;

    const referral = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!referral || referral.bonusPaid) return;

    await this.wallet.credit(referral.referrerId, Number(referral.bonusAmount), referral.id, 'Referral bonus');
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { bonusPaid: true, qualifyingActionAt: new Date() },
    });
    await this.notifications.notify(
      referral.referrerId,
      'Referral bonus earned! 🎉',
      `You earned ₹${referral.bonusAmount} because someone you referred made their first transaction.`,
      'REFERRAL_BONUS',
      { referralId: referral.id },
    );
  }

  async myReferrals(userId: string) {
    return this.prisma.referral.findMany({ where: { referrerId: userId }, orderBy: { createdAt: 'desc' } });
  }
}
