import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletTxnType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({ data: { userId } });
    }
    return wallet;
  }

  /** Credits a user's wallet (e.g. contest prize, booking payout, refund). Runs in a transaction. */
  async credit(userId: string, amount: number, reference: string, description: string, toPending = false) {
    if (amount <= 0) throw new BadRequestException('Credit amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const updateData = toPending
        ? { pendingBalance: { increment: amount } }
        : { balance: { increment: amount }, withdrawableBalance: { increment: amount } };

      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: updateData });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.CREDIT,
          amount,
          balanceAfter: updated.balance,
          reference,
          description,
        },
      });

      return updated;
    });
  }

  /** Moves funds from pending -> withdrawable, e.g. after a dispute window closes. */
  async releasePending(userId: string, amount: number, reference: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.pendingBalance) < amount) {
        throw new BadRequestException('Insufficient pending balance to release');
      }

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: amount },
          balance: { increment: amount },
          withdrawableBalance: { increment: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.RELEASE,
          amount,
          balanceAfter: updated.balance,
          reference,
          description: 'Pending balance released to withdrawable',
        },
      });

      return updated;
    });
  }

  /** Debits for a withdrawal request. Caller must have already confirmed KYC approval. */
  async debitForWithdrawal(userId: string, amount: number, reference: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.withdrawableBalance) < amount) {
        throw new BadRequestException('Insufficient withdrawable balance');
      }

      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          withdrawableBalance: { decrement: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.WITHDRAWAL,
          amount: -amount,
          balanceAfter: updated.balance,
          reference,
          description: 'Withdrawal request',
        },
      });

      return updated;
    });
  }

  async getTransactionHistory(userId: string, take = 50, skip = 0) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  /**
   * Creates a withdrawal request and immediately reserves the funds (debits
   * withdrawableBalance) so the same money can't be requested twice while an
   * admin/payout batch is still processing it. Actual bank transfer happens
   * out-of-band (RazorpayX payout or manual batch — see DEPLOYMENT.md
   * "Configuring Payouts"); this only tracks platform-side state.
   */
  async requestWithdrawal(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Withdrawal amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.withdrawableBalance) < amount) {
        throw new BadRequestException('Insufficient withdrawable balance');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount }, withdrawableBalance: { decrement: amount } },
      });

      const request = await tx.withdrawalRequest.create({
        data: { userId, amount },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxnType.WITHDRAWAL,
          amount: -amount,
          balanceAfter: (await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance,
          reference: request.id,
          description: 'Withdrawal requested — pending admin processing',
        },
      });

      return request;
    });
  }

  async myWithdrawals(userId: string) {
    return this.prisma.withdrawalRequest.findMany({ where: { userId }, orderBy: { requestedAt: 'desc' } });
  }

  // ---- Admin ----

  async pendingWithdrawals() {
    const requests = await this.prisma.withdrawalRequest.findMany({
      where: { status: 'REQUESTED' },
      orderBy: { requestedAt: 'asc' },
    });
    // WithdrawalRequest intentionally has no Prisma relation to User (keeps the
    // ledger table lean) — join in application code instead.
    const userIds = requests.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, mobile: true, kyc: true },
    });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    return requests.map((r) => ({ ...r, user: byId[r.userId] }));
  }

  async markWithdrawalProcessed(requestId: string, status: 'PAID' | 'FAILED' | 'REJECTED', payoutReference?: string, rejectionNote?: string) {
    const request = await this.prisma.withdrawalRequest.findUniqueOrThrow({ where: { id: requestId } });

    // If the withdrawal failed/was rejected, refund the reserved amount back to the wallet.
    if (status === 'FAILED' || status === 'REJECTED') {
      await this.credit(request.userId, Number(request.amount), requestId, `Withdrawal ${status.toLowerCase()} — funds returned`);
    }

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { status, payoutReference, rejectionNote, processedAt: new Date() },
    });

    const messages: Record<string, string> = {
      PAID: `Your withdrawal of ₹${Number(request.amount).toLocaleString('en-IN')} has been paid.`,
      FAILED: `Your withdrawal of ₹${Number(request.amount).toLocaleString('en-IN')} failed and the funds have been returned to your wallet.`,
      REJECTED: rejectionNote || 'Your withdrawal request was rejected and the funds have been returned to your wallet.',
    };
    await this.notifications.notify(request.userId, 'Withdrawal update', messages[status], 'WITHDRAWAL_UPDATE', { requestId, status });

    return updated;
  }
}
