import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
const REFERRAL_BONUS_AMOUNT = 100;
const MIN_QUALIFYING_TRANSACTION = 200;
@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService, private wallet: WalletService, private notifications: NotificationsService) {}
  private generateCode(userId: string): string { return `REF${userId.slice(0, 6).toUpperCase()}`; }
  async myCode(userId: string) { return { code: this.generateCode(userId) }; }
  async recordReferral(refereeId: string, code: string) {
    const referrerId = await this.resolveReferrerFromCode(code);
    if (!referrerId) throw new BadRequestException('Invalid referral code');
    if (referrerId === refereeId) throw new BadRequestException('You cannot refer yourself');
    try { return await this.prisma.referral.create({ data: { referrerId, refereeId, code, bonusAmount: REFERRAL_BONUS_AMOUNT } }); }
    catch (e: any) { if (e.code === 'P2002') throw new ConflictException('This account has already been referred'); throw e; }
  }
  private async resolveReferrerFromCode(code: string): Promise<string | null> {
    const prefix = code.replace(/^REF/, '').toLowerCase();
    const candidates = await this.prisma.user.findMany({ where: { id: { startsWith: prefix } }, select: { id: true }, take: 5 });
    return candidates[0]?.id || null;
  }
  async checkAndPayoutBonus(refereeId: string, transactionAmount: number) {
    if (transactionAmount < MIN_QUALIFYING_TRANSACTION) return;
    const referral = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!referral || referral.bonusPaid) return;
    await this.wallet.credit(referral.referrerId, Number(referral.bonusAmount), referral.id, 'Referral bonus');
    await this.prisma.referral.update({ where: { id: referral.id }, data: { bonusPaid: true, qualifyingActionAt: new Date() } });
    await this.notifications.notify(referral.referrerId, 'Referral bonus earned! 🎉', `You earned ₹${referral.bonusAmount} because someone you referred made their first transaction.`, 'REFERRAL_BONUS', { referralId: referral.id });
  }
  async myReferrals(userId: string) { return this.prisma.referral.findMany({ where: { referrerId: userId }, orderBy: { createdAt: 'desc' } }); }
}
