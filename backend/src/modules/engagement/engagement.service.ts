import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';

export type XpEvent = 'REGISTER' | 'VOTE' | 'TIP' | 'BOOKING' | 'CHECKIN' | 'BATTLE_VOTE';
const XP_KEY: Record<XpEvent, 'xpRegister' | 'xpVote' | 'xpTip' | 'xpBooking' | 'xpCheckIn' | 'xpBattleVote'> = { REGISTER: 'xpRegister', VOTE: 'xpVote', TIP: 'xpTip', BOOKING: 'xpBooking', CHECKIN: 'xpCheckIn', BATTLE_VOTE: 'xpBattleVote' };
export const LEVELS = [{ name: 'Rookie', min: 0 }, { name: 'Rising', min: 250 }, { name: 'Performer', min: 500 }, { name: 'Star', min: 1000 }];
export const BADGES: Record<string, string> = { rising: 'Rising Star', verified: 'Verified Talent', winner: 'Contest Winner', crowd: 'Crowd Favourite', golden: 'Golden Buzzer', bookings: '10 Bookings', streak: '7-day Streak' };

/** India Standard Time day key, so "today" matches the user's calendar day. */
const dayKey = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export function levelFor(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.min) idx = i; });
  const next = LEVELS[idx + 1];
  return { level: LEVELS[idx].name, nextLevel: next?.name ?? null, nextLevelXp: next?.min ?? null };
}

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService, private settings: SettingsService, private notifications: NotificationsService) {}

  async awardXp(userId: string, event: XpEvent) {
    const amount = Number(await this.settings.get(XP_KEY[event]));
    if (!amount) return null;
    const user = await this.prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
    if (user.xp >= 250) await this.award(userId, 'rising');
    return user.xp;
  }

  async award(userId: string, badge: keyof typeof BADGES | string) {
    if (!BADGES[badge]) return false;
    const existing = await this.prisma.userBadge.findUnique({ where: { userId_badge: { userId, badge } } });
    if (existing) return false;
    await this.prisma.userBadge.create({ data: { userId, badge } });
    await this.notifications.notify(userId, 'New badge earned', `You earned the "${BADGES[badge]}" badge.`, 'BADGE_AWARDED', { badge });
    return true;
  }

  async checkIn(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const today = dayKey(new Date());
    const last = user.lastCheckIn ? dayKey(user.lastCheckIn) : null;
    if (last === today) throw new BadRequestException('You have already checked in today');
    const yesterday = dayKey(new Date(Date.now() - 24 * 3600 * 1000));
    const streak = last === yesterday ? user.streak + 1 : 1;
    await this.prisma.user.update({ where: { id: userId }, data: { streak, lastCheckIn: new Date() } });
    await this.awardXp(userId, 'CHECKIN');
    if (streak >= 7) await this.award(userId, 'streak');
    return this.me(userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { badges: true } });
    const earned = new Set(user.badges.map((b) => b.badge));
    return {
      xp: user.xp, streak: user.streak, ...levelFor(user.xp),
      checkedInToday: !!user.lastCheckIn && dayKey(user.lastCheckIn) === dayKey(new Date()),
      badges: Object.entries(BADGES).map(([key, label]) => ({ key, label, earned: earned.has(key) })),
    };
  }

  async leaderboard(take = 20) {
    const users = await this.prisma.user.findMany({ where: { status: 'ACTIVE', xp: { gt: 0 } }, orderBy: { xp: 'desc' }, take: Math.min(take, 100), select: { id: true, name: true, profilePhoto: true, xp: true, role: true } });
    return users.map((u, i) => ({ rank: i + 1, ...u, level: levelFor(u.xp).level }));
  }
}
