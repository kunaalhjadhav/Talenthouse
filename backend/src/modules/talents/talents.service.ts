import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AvailabilityStatus } from '@prisma/client';

@Injectable()
export class TalentsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateProfile(userId: string, data: any) {
    return this.prisma.talentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async search(filters: { category?: string; city?: string; maxPrice?: number }) {
    return this.prisma.talentProfile.findMany({
      where: {
        category: filters.category,
        city: filters.city,
        basePrice: filters.maxPrice ? { lte: filters.maxPrice } : undefined,
        verified: true,
      },
      include: { user: { select: { name: true, profilePhoto: true } } },
      orderBy: { rating: 'desc' },
    });
  }

  async getProfile(id: string) {
    return this.prisma.talentProfile.findUniqueOrThrow({
      where: { id },
      include: { user: { select: { name: true, profilePhoto: true, city: true } }, availability: true },
    });
  }

  async setAvailability(talentId: string, date: string, startTime: string, endTime: string, status: AvailabilityStatus) {
    return this.prisma.calendarSlot.create({
      data: { talentId, date: new Date(date), startTime, endTime, status },
    });
  }

  async getCalendar(talentId: string, from: string, to: string) {
    return this.prisma.calendarSlot.findMany({
      where: { talentId, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { date: 'asc' },
    });
  }

  /** Ensures the requested slot is actually AVAILABLE before a booking can be created. */
  async assertSlotAvailable(talentId: string, date: string) {
    const conflict = await this.prisma.calendarSlot.findFirst({
      where: { talentId, date: new Date(date), status: { in: [AvailabilityStatus.BOOKED, AvailabilityStatus.UNAVAILABLE, AvailabilityStatus.BLOCKED] } },
    });
    if (conflict) throw new BadRequestException('Talent is not available on this date');
  }
}
