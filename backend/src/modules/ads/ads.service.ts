import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AdStatus } from '@prisma/client';

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  /** Public-facing: returns active ads for a given placement, for the app/website to render. */
  async forPlacement(placement: string, category?: string, city?: string) {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: {
        placement,
        status: AdStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
        category: category ? { equals: category } : undefined,
        city: city ? { equals: city } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordImpression(adId: string) {
    return this.prisma.advertisement.update({ where: { id: adId }, data: { impressions: { increment: 1 } } });
  }

  async recordClick(adId: string) {
    return this.prisma.advertisement.update({ where: { id: adId }, data: { clicks: { increment: 1 } } });
  }

  // ---- Admin ----

  async create(data: any) {
    return this.prisma.advertisement.create({ data: { ...data, status: AdStatus.DRAFT } });
  }

  async list() {
    return this.prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async setStatus(id: string, status: AdStatus) {
    return this.prisma.advertisement.update({ where: { id }, data: { status } });
  }

  async update(id: string, data: any) {
    return this.prisma.advertisement.update({ where: { id }, data });
  }
}
