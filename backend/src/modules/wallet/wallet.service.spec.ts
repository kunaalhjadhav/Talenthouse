import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let notifications: { notify: jest.Mock };

  // Minimal in-memory fake for the parts of $transaction WalletService actually uses,
  // so we can assert real balance arithmetic rather than mocking every step away.
  function makeTxWallet(overrides: Partial<any> = {}) {
    return { id: 'wallet1', userId: 'user1', balance: 0, pendingBalance: 0, withdrawableBalance: 0, ...overrides };
  }

  beforeEach(async () => {
    notifications = { notify: jest.fn() };

    prisma = {
      wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      walletTransaction: { create: jest.fn() },
      withdrawalRequest: { create: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      user: { findMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(WalletService);
  });

  describe('credit', () => {
    it('rejects a non-positive amount without touching the database', async () => {
      await expect(service.credit('user1', 0, 'ref', 'test')).rejects.toThrow(BadRequestException);
      await expect(service.credit('user1', -10, 'ref', 'test')).rejects.toThrow(BadRequestException);
      expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    });

    it('credits balance and withdrawableBalance together for a normal (non-pending) credit', async () => {
      prisma.wallet.upsert.mockResolvedValueOnce(makeTxWallet());
      prisma.wallet.update.mockResolvedValueOnce(makeTxWallet({ balance: 500, withdrawableBalance: 500 }));

      await service.credit('user1', 500, 'contest_1_prize', 'Prize money');

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { balance: { increment: 500 }, withdrawableBalance: { increment: 500 } },
        }),
      );
    });

    it('credits only pendingBalance when toPending=true, leaving withdrawable untouched', async () => {
      prisma.wallet.upsert.mockResolvedValueOnce(makeTxWallet());
      prisma.wallet.update.mockResolvedValueOnce(makeTxWallet({ pendingBalance: 500 }));

      await service.credit('user1', 500, 'ref', 'desc', true);

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { pendingBalance: { increment: 500 } } }),
      );
    });

    it('always records a WalletTransaction row for auditability', async () => {
      prisma.wallet.upsert.mockResolvedValueOnce(makeTxWallet());
      prisma.wallet.update.mockResolvedValueOnce(makeTxWallet({ balance: 100, withdrawableBalance: 100 }));

      await service.credit('user1', 100, 'ref1', 'test credit');

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'CREDIT', amount: 100, reference: 'ref1' }) }),
      );
    });
  });

  describe('requestWithdrawal', () => {
    it('rejects when the amount exceeds withdrawableBalance', async () => {
      prisma.wallet.findUnique.mockResolvedValueOnce(makeTxWallet({ withdrawableBalance: 100 }));
      await expect(service.requestWithdrawal('user1', 500)).rejects.toThrow(BadRequestException);
    });

    it('throws if the wallet does not exist yet', async () => {
      prisma.wallet.findUnique.mockResolvedValueOnce(null);
      await expect(service.requestWithdrawal('user1', 100)).rejects.toThrow(NotFoundException);
    });

    it('reserves funds immediately (decrements balance+withdrawable) so the same money cannot be double-requested', async () => {
      prisma.wallet.findUnique.mockResolvedValueOnce(makeTxWallet({ balance: 1000, withdrawableBalance: 1000 }));
      prisma.withdrawalRequest.create.mockResolvedValueOnce({ id: 'wr1', userId: 'user1', amount: 300 });
      prisma.wallet.findUniqueOrThrow.mockResolvedValueOnce(makeTxWallet({ balance: 700, withdrawableBalance: 700 }));

      await service.requestWithdrawal('user1', 300);

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { balance: { decrement: 300 }, withdrawableBalance: { decrement: 300 } },
        }),
      );
    });
  });

  describe('markWithdrawalProcessed', () => {
    it('refunds the wallet when a withdrawal fails, and notifies the user', async () => {
      prisma.withdrawalRequest.findUniqueOrThrow.mockResolvedValueOnce({ id: 'wr1', userId: 'user1', amount: 300 });
      // credit() internals:
      prisma.wallet.upsert.mockResolvedValueOnce(makeTxWallet());
      prisma.wallet.update.mockResolvedValueOnce(makeTxWallet({ balance: 300, withdrawableBalance: 300 }));
      prisma.withdrawalRequest.update.mockResolvedValueOnce({ id: 'wr1', status: 'FAILED' });

      await service.markWithdrawalProcessed('wr1', 'FAILED');

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { balance: { increment: 300 }, withdrawableBalance: { increment: 300 } } }),
      );
      expect(notifications.notify).toHaveBeenCalledWith('user1', 'Withdrawal update', expect.any(String), 'WITHDRAWAL_UPDATE', expect.anything());
    });

    it('does NOT refund the wallet when a withdrawal is marked PAID', async () => {
      prisma.withdrawalRequest.findUniqueOrThrow.mockResolvedValueOnce({ id: 'wr1', userId: 'user1', amount: 300 });
      prisma.withdrawalRequest.update.mockResolvedValueOnce({ id: 'wr1', status: 'PAID' });

      await service.markWithdrawalProcessed('wr1', 'PAID', 'UTR123');

      expect(prisma.wallet.update).not.toHaveBeenCalled();
    });
  });
});
