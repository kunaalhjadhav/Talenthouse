import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from '../../config/prisma.service';

describe('CommissionService', () => {
  let service: CommissionService;
  let prisma: { commissionRule: { findUnique: jest.Mock; upsert: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      commissionRule: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CommissionService);
  });

  describe('resolvePercentage', () => {
    it('uses the entity-specific override when provided, ignoring the DB entirely', async () => {
      const pct = await service.resolvePercentage('CONTEST', 'singing', 30);
      expect(pct).toBe(30);
      expect(prisma.commissionRule.findUnique).not.toHaveBeenCalled();
    });

    it('falls through to a category-specific rule when no override is given', async () => {
      prisma.commissionRule.findUnique.mockResolvedValueOnce({ percentage: 22, active: true });
      const pct = await service.resolvePercentage('CONTEST', 'singing', null);
      expect(pct).toBe(22);
    });

    it('skips an inactive category-specific rule and falls through to GLOBAL', async () => {
      prisma.commissionRule.findUnique
        .mockResolvedValueOnce({ percentage: 22, active: false }) // category-specific, inactive
        .mockResolvedValueOnce({ percentage: 18, active: true }); // GLOBAL
      const pct = await service.resolvePercentage('CONTEST', 'singing', undefined);
      expect(pct).toBe(18);
    });

    it('falls back to the hardcoded platform default when nothing is configured anywhere', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(null);
      const pct = await service.resolvePercentage('CONTEST', 'singing', undefined);
      expect(pct).toBe(25); // documented PRD default
    });

    it('uses scope-specific defaults for BOOKING and VOTING when unconfigured', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(null);
      expect(await service.resolvePercentage('BOOKING')).toBe(15);
      expect(await service.resolvePercentage('VOTING')).toBe(20);
    });

    it('works with no key at all (GLOBAL-only lookup)', async () => {
      prisma.commissionRule.findUnique.mockResolvedValueOnce({ percentage: 27, active: true });
      const pct = await service.resolvePercentage('CONTEST');
      expect(pct).toBe(27);
    });
  });

  describe('split', () => {
    it('splits a gross amount correctly at a round percentage', () => {
      const result = service.split(1000, 25);
      expect(result.commission).toBe(250);
      expect(result.net).toBe(750);
    });

    it('rounds to 2 decimal places rather than leaking floating-point drift', () => {
      const result = service.split(333.33, 15);
      // 333.33 * 0.15 = 49.9995 -> rounds to 50.00
      expect(result.commission).toBeCloseTo(50, 2);
      expect(result.commission + result.net).toBeCloseTo(333.33, 2);
    });

    it('commission + net always reconstitutes the original gross amount exactly (no money created or destroyed)', () => {
      const cases = [[50000, 25], [199, 15], [1, 99], [10000000, 0.5]];
      for (const [gross, pct] of cases) {
        const { commission, net } = service.split(gross, pct);
        expect(Math.round((commission + net) * 100) / 100).toBeCloseTo(gross, 2);
      }
    });

    it('a 0% commission returns the full amount as net', () => {
      const { commission, net } = service.split(5000, 0);
      expect(commission).toBe(0);
      expect(net).toBe(5000);
    });
  });

  describe('upsertRule', () => {
    it('passes through to prisma.commissionRule.upsert with the right composite key', async () => {
      prisma.commissionRule.upsert.mockResolvedValueOnce({ id: 'rule1' });
      await service.upsertRule('CONTEST', 'dance', 20);
      expect(prisma.commissionRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope_key: { scope: 'CONTEST', key: 'dance' } },
        }),
      );
    });
  });
});
