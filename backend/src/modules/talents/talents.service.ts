import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AvailabilityStatus } from '@prisma/client';
@Injectable()
export class TalentsService {
  constructor(private prisma: PrismaService) {}
  /** Whitelisted fields only: talents can never set their own verified flag or rating. */
  async createOrUpdateProfile(userId: string, data: any) {
    const allowed = ['stageName', 'category', 'skills', 'basePrice', 'serviceRadiusKm', 'city', 'latitude', 'longitude', 'portfolioUrls'];
    const clean: any = {};
    for (const k of allowed) if (data?.[k] !== undefined) clean[k] = data[k];
    if (!clean.category || clean.basePrice === undefined) { const existing = await this.prisma.talentProfile.findUnique({ where: { userId } }); if (!existing && (!clean.category || clean.basePrice === undefined)) throw new BadRequestException('category and basePrice are required'); }
    return this.prisma.talentProfile.upsert({ where: { userId }, create: { userId, ...clean }, update: clean });
  }
  /** Verified talents only. PRO and PREMIUM talents are listed first, then by rating. */
  async search(filters: { category?: string; city?: string; maxPrice?: number }) {
    const talents = await this.prisma.talentProfile.findMany({ where: { category: filters.category, city: filters.city, basePrice: filters.maxPrice ? { lte: filters.maxPrice } : undefined, verified: true }, include: { user: { select: { name: true, profilePhoto: true } } }, orderBy: { rating: 'desc' } });
    const subs = await this.prisma.subscription.findMany({ where: { userId: { in: talents.map((t) => t.userId) }, status: 'ACTIVE', plan: { in: ['PREMIUM', 'PRO'] } } });
    const weight: Record<string, number> = {};
    for (const s of subs) if (!s.expiresAt || s.expiresAt > new Date()) weight[s.userId] = s.plan === 'PRO' ? 2 : 1;
    return talents.map((t) => ({ ...t, plan: weight[t.userId] === 2 ? 'PRO' : weight[t.userId] === 1 ? 'PREMIUM' : 'FREE' })).sort((a, b) => (weight[b.userId] ?? 0) - (weight[a.userId] ?? 0));
  }
  myProfile(userId: string) { return this.prisma.talentProfile.findUnique({ where: { userId }, include: { user: { select: { name: true, profilePhoto: true } } } }); }
  async myCalendar(userId: string, from?: string, to?: string) {
    const profile = await this.prisma.talentProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(to) : new Date(start.getTime() + 60 * 24 * 3600 * 1000);
    return this.prisma.calendarSlot.findMany({ where: { talentId: profile.id, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } });
  }
  /** Talent blocks or unblocks a whole day. Booked days cannot be unblocked here. */
  async setDayBlocked(userId: string, date: string, blocked: boolean) {
    const profile = await this.prisma.talentProfile.findUniqueOrThrow({ where: { userId } });
    const day = new Date(date);
    if (isNaN(day.getTime())) throw new BadRequestException('Invalid date');
    if (blocked) {
      const busy = await this.prisma.calendarSlot.findFirst({ where: { talentId: profile.id, date: day, status: { in: [AvailabilityStatus.BOOKED, AvailabilityStatus.TENTATIVE] } } });
      if (busy) throw new BadRequestException('There is a booking or a pending request on this date');
      const exists = await this.prisma.calendarSlot.findFirst({ where: { talentId: profile.id, date: day, status: AvailabilityStatus.BLOCKED } });
      if (!exists) await this.prisma.calendarSlot.create({ data: { talentId: profile.id, date: day, startTime: '00:00', endTime: '23:59', status: AvailabilityStatus.BLOCKED } });
    } else {
      await this.prisma.calendarSlot.deleteMany({ where: { talentId: profile.id, date: day, status: AvailabilityStatus.BLOCKED } });
    }
    return { date, blocked };
  }
  async getProfile(id: string) { return this.prisma.talentProfile.findUniqueOrThrow({ where: { id }, include: { user: { select: { name: true, profilePhoto: true, city: true } }, availability: true } }); }
  async setAvailability(talentId: string, date: string, startTime: string, endTime: string, status: AvailabilityStatus) { return this.prisma.calendarSlot.create({ data: { talentId, date: new Date(date), startTime, endTime, status } }); }
  async getCalendar(talentId: string, from: string, to: string) { return this.prisma.calendarSlot.findMany({ where: { talentId, date: { gte: new Date(from), lte: new Date(to) } }, orderBy: { date: 'asc' } }); }
  async assertSlotAvailable(talentId: string, date: string) { const conflict = await this.prisma.calendarSlot.findFirst({ where: { talentId, date: new Date(date), status: { in: [AvailabilityStatus.BOOKED, AvailabilityStatus.UNAVAILABLE, AvailabilityStatus.BLOCKED] } } }); if (conflict) throw new BadRequestException('Talent is not available on this date'); }
}
