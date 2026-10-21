import { BadRequestException } from '@nestjs/common';
import { prizeShares } from '../contests/prize';
import { SettingsService, SETTING_DEFAULTS } from '../settings/settings.service';
import { EngagementService, levelFor } from '../engagement/engagement.service';
import { PaymentsService } from '../payments/payments.service';

describe('prizeShares', () => {
  it('always adds up to 100% for any winner count', () => {
    for (let n = 1; n <= 12; n++) expect(prizeShares(n).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('uses 50/30/20 for three winners', () => expect(prizeShares(3)).toEqual([0.5, 0.3, 0.2]));
});

describe('levelFor', () => {
  it('maps XP to levels', () => {
    expect(levelFor(0).level).toBe('Rookie');
    expect(levelFor(250).level).toBe('Rising');
    expect(levelFor(999).level).toBe('Performer');
    expect(levelFor(1000).nextLevel).toBeNull();
  });
});

describe('SettingsService', () => {
  const make = (rows: any[] = []) => { const upserts: any[] = []; const prisma: any = { appSetting: { findMany: async () => rows, upsert: async (a: any) => { upserts.push(a); } } }; return { svc: new SettingsService(prisma), upserts }; };
  it('returns defaults when nothing is stored and overrides when stored', async () => {
    expect((await make().svc.all()).contestCommission).toBe(25);
    expect((await make([{ key: 'contestCommission', value: 30 }]).svc.all()).contestCommission).toBe(30);
  });
  it('rejects unknown keys, bad percentages and weights that do not add up', async () => {
    const { svc } = make();
    await expect(svc.setMany({ nope: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.setMany({ contestCommission: 120 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.setMany({ judgeWeight: 60 })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('saves a valid change', async () => {
    const { svc, upserts } = make();
    await svc.setMany({ judgeWeight: 60, publicWeight: 40 });
    expect(upserts.map((u) => u.where.key).sort()).toEqual(['judgeWeight', 'publicWeight']);
  });
  it('exposes every default', () => expect(Object.keys(SETTING_DEFAULTS)).toContain('tipPresets'));
});

describe('EngagementService.checkIn', () => {
  const day = 24 * 3600 * 1000;
  const make = (user: any) => {
    const state = { ...user };
    const prisma: any = {
      user: { findUniqueOrThrow: async () => ({ ...state, badges: [] }), update: async ({ data }: any) => { if (data.streak !== undefined) state.streak = data.streak; if (data.lastCheckIn) state.lastCheckIn = data.lastCheckIn; if (data.xp) state.xp += 10; return state; } },
      userBadge: { findUnique: async () => null, create: async () => ({}) },
    };
    const settings: any = { get: async () => 10 };
    const notifications: any = { notify: async () => ({}) };
    return new EngagementService(prisma, settings, notifications);
  };
  it('starts a streak, continues it on consecutive days, and blocks a second check-in the same day', async () => {
    const first = make({ id: 'u', xp: 0, streak: 0, lastCheckIn: null });
    expect((await first.checkIn('u')).streak).toBe(1);
    const next = make({ id: 'u', xp: 0, streak: 3, lastCheckIn: new Date(Date.now() - day) });
    expect((await next.checkIn('u')).streak).toBe(4);
    const again = make({ id: 'u', xp: 0, streak: 3, lastCheckIn: new Date() });
    await expect(again.checkIn('u')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('resets the streak after a missed day', async () => {
    const svc = make({ id: 'u', xp: 0, streak: 5, lastCheckIn: new Date(Date.now() - 3 * day) });
    expect((await svc.checkIn('u')).streak).toBe(1);
  });
});

describe('PaymentsService webhook idempotency', () => {
  it('credits a tip exactly once even if the webhook is delivered twice', async () => {
    let claims = 0; const tips: any[] = []; const credits: any[] = [];
    const payment = { id: 'p1', userId: 'fan', purpose: 'TIP', amount: 50, contestId: null, bookingId: null, razorpayOrderId: 'order_1', metadata: { toUserId: 'creator', reelId: null } };
    const prisma: any = {
      payment: { findUnique: async () => payment, updateMany: async () => ({ count: claims++ === 0 ? 1 : 0 }) },
      tip: { create: async (a: any) => tips.push(a) },
    };
    const wallet: any = { credit: async (...a: any[]) => credits.push(a) };
    const referrals: any = { checkAndPayoutBonus: async () => undefined };
    const engagement: any = { awardXp: async () => 1 };
    const notifications: any = { notify: async () => undefined };
    const svc = new PaymentsService(prisma, {} as any, {} as any, wallet, referrals, {} as any, engagement, notifications);
    const event = { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_1', id: 'pay_1' } } } };
    await svc.handleWebhookEvent(event);
    await svc.handleWebhookEvent(event);
    expect(tips).toHaveLength(1);
    expect(credits).toHaveLength(1);
    expect(credits[0][0]).toBe('creator');
    expect(credits[0][1]).toBe(50);
  });
});
