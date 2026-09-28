import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

const DEFAULT_CONTEST_COMMISSION_PCT = 25;
const DEFAULT_BOOKING_COMMISSION_PCT = 15;
const DEFAULT_VOTING_COMMISSION_PCT = 20;

export type CommissionScope = 'CONTEST' | 'BOOKING' | 'VOTING';

/**
 * Central, admin-configurable commission engine.
 * Nothing in the platform should hard-code a percentage — every module resolves
 * its cut through this service, which checks (in order of priority):
 *   1. An entity-specific override (e.g. Contest.commissionPct)
 *   2. A CommissionRule keyed to a specific category/talent/etc.
 *   3. A CommissionRule keyed "GLOBAL" for that scope
 *   4. A hardcoded platform default (last-resort fallback only)
 */
@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  private defaultFor(scope: CommissionScope): number {
    switch (scope) {
      case 'CONTEST':
        return DEFAULT_CONTEST_COMMISSION_PCT;
      case 'BOOKING':
        return DEFAULT_BOOKING_COMMISSION_PCT;
      case 'VOTING':
        return DEFAULT_VOTING_COMMISSION_PCT;
    }
  }

  async resolvePercentage(scope: CommissionScope, key?: string, entityOverride?: number | null): Promise<number> {
    if (entityOverride !== undefined && entityOverride !== null) {
      return Number(entityOverride);
    }

    if (key) {
      const specific = await this.prisma.commissionRule.findUnique({
        where: { scope_key: { scope, key } },
      });
      if (specific?.active) return Number(specific.percentage);
    }

    const global = await this.prisma.commissionRule.findUnique({
      where: { scope_key: { scope, key: 'GLOBAL' } },
    });
    if (global?.active) return Number(global.percentage);

    return this.defaultFor(scope);
  }

  /** Splits a gross amount into platform commission + net payout, given a resolved percentage. */
  split(grossAmount: number, commissionPct: number) {
    const commission = Math.round((grossAmount * commissionPct) / 100 * 100) / 100;
    const net = Math.round((grossAmount - commission) * 100) / 100;
    return { grossAmount, commissionPct, commission, net };
  }

  async upsertRule(scope: CommissionScope, key: string, percentage: number, fixedFee?: number) {
    return this.prisma.commissionRule.upsert({
      where: { scope_key: { scope, key } },
      create: { scope, key, percentage, fixedFee, active: true },
      update: { percentage, fixedFee, active: true },
    });
  }

  async listRules(scope?: CommissionScope) {
    return this.prisma.commissionRule.findMany({
      where: scope ? { scope } : undefined,
      orderBy: [{ scope: 'asc' }, { key: 'asc' }],
    });
  }
}
