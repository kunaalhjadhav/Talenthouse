import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SettingsService } from '../settings/settings.service';
export type CommissionScope = 'CONTEST' | 'BOOKING' | 'VOTING';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}
  private async defaultFor(scope: CommissionScope): Promise<number> { const s = await this.settings.all(); switch (scope) { case 'CONTEST': return s.contestCommission; case 'BOOKING': return s.bookingCommission; case 'VOTING': return s.votingCommission; } }
  async resolvePercentage(scope: CommissionScope, key?: string, entityOverride?: number | null): Promise<number> {
    if (entityOverride !== undefined && entityOverride !== null) return Number(entityOverride);
    if (key && key !== 'GLOBAL') { const specific = await this.prisma.commissionRule.findUnique({ where: { scope_key: { scope, key } } }); if (specific?.active) return Number(specific.percentage); }
    // The global rate lives in the admin Settings (single source of truth).
    return this.defaultFor(scope);
  }
  split(grossAmount: number, commissionPct: number) {
    const commission = Math.round((grossAmount * commissionPct) / 100 * 100) / 100;
    const net = Math.round((grossAmount - commission) * 100) / 100;
    return { grossAmount, commissionPct, commission, net };
  }
  private globalKey(scope: CommissionScope) { return scope === 'CONTEST' ? 'contestCommission' : scope === 'BOOKING' ? 'bookingCommission' : 'votingCommission'; }
  async upsertRule(scope: CommissionScope, key: string, percentage: number, fixedFee?: number) {
    if (key === 'GLOBAL') { await this.settings.setMany({ [this.globalKey(scope)]: percentage }); return { scope, key, percentage, active: true }; }
    return this.prisma.commissionRule.upsert({ where: { scope_key: { scope, key } }, create: { scope, key, percentage, fixedFee, active: true }, update: { percentage, fixedFee, active: true } });
  }
  async listRules(scope?: CommissionScope) {
    const s = await this.settings.all();
    const globals = (['CONTEST', 'BOOKING', 'VOTING'] as CommissionScope[]).filter((c) => !scope || c === scope).map((c) => ({ id: `global-${c}`, scope: c, key: 'GLOBAL', percentage: (s as any)[this.globalKey(c)], active: true }));
    const rows = await this.prisma.commissionRule.findMany({ where: { ...(scope ? { scope } : {}), key: { not: 'GLOBAL' } }, orderBy: [{ scope: 'asc' }, { key: 'asc' }] });
    return [...globals, ...rows];
  }
}
