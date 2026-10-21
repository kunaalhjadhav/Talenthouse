import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

/** Every business rule that must not be hard-coded lives here with its default. Admin overrides are stored in the AppSetting table. */
export const SETTING_DEFAULTS = {
  contestCommission: 25,
  bookingCommission: 15,
  votingCommission: 20,
  advancePct: 30,
  judgeWeight: 70,
  publicWeight: 30,
  votePrice: 10,
  dailyFreeVotes: 5,
  referralBonus: 100,
  minWithdraw: 500,
  premiumPrice: 199,
  proPrice: 499,
  premiumCommissionDiscount: 3,
  proCommissionDiscount: 5,
  tipPresets: [10, 50, 100] as number[],
  xpRegister: 50,
  xpVote: 5,
  xpTip: 10,
  xpBooking: 30,
  xpCheckIn: 10,
  xpBattleVote: 5,
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;
const PCT_KEYS: SettingKey[] = ['contestCommission', 'bookingCommission', 'votingCommission', 'advancePct', 'judgeWeight', 'publicWeight', 'premiumCommissionDiscount', 'proCommissionDiscount'];

@Injectable()
export class SettingsService {
  private cache: { at: number; data: typeof SETTING_DEFAULTS } | null = null;
  constructor(private prisma: PrismaService) {}

  async all(): Promise<typeof SETTING_DEFAULTS> {
    if (this.cache && Date.now() - this.cache.at < 5000) return this.cache.data;
    const rows = await this.prisma.appSetting.findMany();
    const data: any = { ...SETTING_DEFAULTS };
    for (const r of rows) if (r.key in SETTING_DEFAULTS) data[r.key] = r.value;
    this.cache = { at: Date.now(), data };
    return data;
  }
  async get<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> { return (await this.all())[key]; }

  async setMany(values: Record<string, unknown>) {
    const next: any = { ...(await this.all()) };
    for (const [key, raw] of Object.entries(values)) {
      if (!(key in SETTING_DEFAULTS)) throw new BadRequestException(`Unknown setting "${key}"`);
      if (key === 'tipPresets') {
        if (!Array.isArray(raw) || raw.length === 0 || raw.length > 6 || raw.some((n) => !Number.isFinite(Number(n)) || Number(n) <= 0)) throw new BadRequestException('tipPresets must be 1 to 6 positive numbers');
        next[key] = raw.map(Number);
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`"${key}" must be a number of 0 or more`);
        if (PCT_KEYS.includes(key as SettingKey) && n > 100) throw new BadRequestException(`"${key}" cannot be above 100`);
        next[key] = n;
      }
    }
    if (Math.round(next.judgeWeight + next.publicWeight) !== 100) throw new BadRequestException('Judge weight and public weight must add up to 100');
    for (const key of Object.keys(values)) await this.prisma.appSetting.upsert({ where: { key }, create: { key, value: next[key] }, update: { value: next[key] } });
    this.cache = null;
    return this.all();
  }
}
