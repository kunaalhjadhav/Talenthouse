import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { PrismaService } from '../../config/prisma.service';
import { CommissionService } from '../commission/commission.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ContestsService.settleContest', () => {
  let service: ContestsService;
  let prisma: any;
  let commission: { resolvePercentage: jest.Mock; split: jest.Mock };
  let wallet: { credit: jest.Mock };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      contest: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      contestRegistration: { update: jest.fn() },
    };
    commission = {
      resolvePercentage: jest.fn().mockResolvedValue(25),
      split: jest.fn((gross: number, pct: number) => ({
        grossAmount: gross,
        commissionPct: pct,
        commission: Math.round((gross * pct) / 100 * 100) / 100,
        net: Math.round((gross - (gross * pct) / 100) * 100) / 100,
      })),
    };
    wallet = { credit: jest.fn() };
    notifications = { notify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommissionService, useValue: commission },
        { provide: WalletService, useValue: wallet },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ContestsService);
  });

  it('refuses to settle a contest that is still in DRAFT/LIVE/etc.', async () => {
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({ status: 'LIVE', registrations: [] });
    await expect(service.settleContest('contest1')).rejects.toThrow(BadRequestException);
  });

  it('pays the host their share net of platform commission, computed on gross registration revenue', async () => {
    const registrations = [
      { id: 'r1', userId: 'winner1', finalScore: 90 },
      { id: 'r2', userId: 'user2', finalScore: 70 },
    ];
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'contest1',
      hostId: 'host1',
      status: 'ONGOING',
      category: 'singing',
      entryFee: 500,
      numWinners: 1,
      prizePool: 0,
      commissionPct: null,
      title: 'Sing Off',
      registrations,
    });
    prisma.contestRegistration.update.mockResolvedValue({});
    prisma.contest.update.mockResolvedValueOnce({ status: 'COMPLETED' });

    await service.settleContest('contest1');

    // gross = 500 * 2 registrations = 1000; 25% commission = 250; host net = 750
    expect(commission.resolvePercentage).toHaveBeenCalledWith('CONTEST', 'singing', null);
    expect(wallet.credit).toHaveBeenCalledWith('host1', 750, expect.stringContaining('contest1'), expect.any(String));
  });

  it('does NOT pay the host anything if there were zero registrations (no revenue to take a cut of)', async () => {
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'contest1', hostId: 'host1', status: 'ONGOING', category: 'dance',
      entryFee: 500, numWinners: 1, prizePool: 0, commissionPct: null, title: 'X', registrations: [],
    });
    prisma.contest.update.mockResolvedValueOnce({ status: 'COMPLETED' });

    await service.settleContest('contest1');

    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('splits the prize pool equally among numWinners top-ranked participants and notifies each', async () => {
    const registrations = [
      { id: 'r1', userId: 'winner1', finalScore: 95 },
      { id: 'r2', userId: 'winner2', finalScore: 90 },
      { id: 'r3', userId: 'loser1', finalScore: 50 },
    ];
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'contest1', hostId: 'host1', status: 'ONGOING', category: 'dance',
      entryFee: 0, numWinners: 2, prizePool: 10000, commissionPct: null, title: 'Dance Off', registrations,
    });
    prisma.contestRegistration.update.mockResolvedValue({});
    prisma.contest.update.mockResolvedValueOnce({ status: 'COMPLETED' });

    await service.settleContest('contest1');

    // Top 2 by array order (already sorted by finalScore desc via the query in real usage) split 10000 -> 5000 each
    expect(wallet.credit).toHaveBeenCalledWith('winner1', 5000, expect.any(String), expect.any(String));
    expect(wallet.credit).toHaveBeenCalledWith('winner2', 5000, expect.any(String), expect.any(String));
    expect(wallet.credit).not.toHaveBeenCalledWith('loser1', expect.anything(), expect.any(String), expect.any(String));
    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });

  it('respects an entity-level commissionPct override instead of the resolved category default', async () => {
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'contest1', hostId: 'host1', status: 'REGISTRATION_CLOSED', category: 'singing',
      entryFee: 1000, numWinners: 1, prizePool: 0, commissionPct: 10, title: 'X',
      registrations: [{ id: 'r1', userId: 'u1', finalScore: 80 }],
    });
    prisma.contestRegistration.update.mockResolvedValue({});
    prisma.contest.update.mockResolvedValueOnce({ status: 'COMPLETED' });

    await service.settleContest('contest1');

    expect(commission.resolvePercentage).toHaveBeenCalledWith('CONTEST', 'singing', 10);
  });

  it('marks the contest COMPLETED after settlement', async () => {
    prisma.contest.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'contest1', hostId: 'host1', status: 'ONGOING', category: 'dance',
      entryFee: 0, numWinners: 0, prizePool: 0, commissionPct: null, title: 'X', registrations: [],
    });
    prisma.contest.update.mockResolvedValueOnce({ status: 'COMPLETED' });

    await service.settleContest('contest1');

    expect(prisma.contest.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'contest1' }, data: { status: 'COMPLETED' } }),
    );
  });
});
