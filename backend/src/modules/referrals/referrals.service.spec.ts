import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReferralsService.checkAndPayoutBonus', () => {
  let service: ReferralsService;
  let prisma: any;
  let wallet: { credit: jest.Mock };
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      referral: { findUnique: jest.fn(), update: jest.fn() },
    };
    wallet = { credit: jest.fn() };
    notifications = { notify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: wallet },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ReferralsService);
  });

  it('does nothing if the transaction is below the minimum qualifying amount', async () => {
    await service.checkAndPayoutBonus('referee1', 50); // below MIN_QUALIFYING_TRANSACTION (200)
    expect(prisma.referral.findUnique).not.toHaveBeenCalled();
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('does nothing if this user was never referred', async () => {
    prisma.referral.findUnique.mockResolvedValueOnce(null);
    await service.checkAndPayoutBonus('referee1', 500);
    expect(wallet.credit).not.toHaveBeenCalled();
  });

  it('pays the referrer once, and marks bonusPaid so it cannot be paid twice', async () => {
    prisma.referral.findUnique.mockResolvedValueOnce({
      id: 'ref1', referrerId: 'referrer1', refereeId: 'referee1', bonusAmount: 100, bonusPaid: false,
    });

    await service.checkAndPayoutBonus('referee1', 500);

    expect(wallet.credit).toHaveBeenCalledWith('referrer1', 100, 'ref1', 'Referral bonus');
    expect(prisma.referral.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ref1' }, data: expect.objectContaining({ bonusPaid: true }) }),
    );
    expect(notifications.notify).toHaveBeenCalledWith('referrer1', expect.any(String), expect.any(String), 'REFERRAL_BONUS', expect.anything());
  });

  it('is idempotent — a second qualifying transaction after the bonus was already paid does nothing further', async () => {
    prisma.referral.findUnique.mockResolvedValueOnce({
      id: 'ref1', referrerId: 'referrer1', refereeId: 'referee1', bonusAmount: 100, bonusPaid: true, // already paid
    });

    await service.checkAndPayoutBonus('referee1', 500);

    expect(wallet.credit).not.toHaveBeenCalled();
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });

  describe('recordReferral', () => {
    it('rejects a user attempting to refer themselves', async () => {
      // resolveReferrerFromCode isn't mocked here, so we test the self-referral
      // guard directly via a code that would resolve to the same user id.
      jest.spyOn<any, any>(service as any, 'resolveReferrerFromCode').mockResolvedValueOnce('user1');
      await expect(service.recordReferral('user1', 'REFuser1x')).rejects.toThrow('You cannot refer yourself');
    });
  });
});
