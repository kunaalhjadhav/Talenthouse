import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AuditionStatus, ApplicationStatus } from '@prisma/client';
import { CreateAuditionDto } from './dto';

@Injectable()
export class AuditionsService {
  constructor(private prisma: PrismaService) {}

  async create(recruiterId: string, dto: CreateAuditionDto) {
    return this.prisma.audition.create({
      data: {
        ...dto,
        recruiterId,
        applicationDeadline: new Date(dto.applicationDeadline),
        auditionDate: dto.auditionDate ? new Date(dto.auditionDate) : undefined,
        status: AuditionStatus.SUBMITTED,
      },
    });
  }

  async findLive(filters: { category?: string; location?: string }) {
    return this.prisma.audition.findMany({
      where: {
        status: AuditionStatus.LIVE,
        category: filters.category,
        location: filters.location ? { contains: filters.location, mode: 'insensitive' } : undefined,
        applicationDeadline: { gte: new Date() },
      },
      orderBy: { applicationDeadline: 'asc' },
    });
  }

  /** All auditions a recruiter has posted, any status — powers the recruiter dashboard. */
  async findByRecruiter(recruiterId: string) {
    return this.prisma.audition.findMany({
      where: { recruiterId },
      include: { applications: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const audition = await this.prisma.audition.findUnique({
      where: { id },
      include: { recruiter: { select: { name: true } } },
    });
    if (!audition) throw new NotFoundException('Audition not found');
    return audition;
  }

  async apply(userId: string, auditionId: string, portfolioUrls?: string[], resumeUrl?: string) {
    const audition = await this.prisma.audition.findUniqueOrThrow({ where: { id: auditionId } });
    if (audition.status !== AuditionStatus.LIVE) {
      throw new BadRequestException('This audition is not currently accepting applications');
    }
    if (audition.applicationDeadline < new Date()) {
      throw new BadRequestException('Application deadline has passed');
    }

    return this.prisma.auditionApplication.upsert({
      where: { auditionId_userId: { auditionId, userId } },
      create: { auditionId, userId, portfolioUrls: portfolioUrls || [], resumeUrl },
      update: { portfolioUrls: portfolioUrls || [], resumeUrl },
    });
  }

  async myApplications(userId: string) {
    return this.prisma.auditionApplication.findMany({
      where: { userId },
      include: { audition: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recruiterApplications(recruiterId: string, auditionId: string) {
    const audition = await this.prisma.audition.findUniqueOrThrow({ where: { id: auditionId } });
    if (audition.recruiterId !== recruiterId) throw new ForbiddenException('Not your audition');

    return this.prisma.auditionApplication.findMany({
      where: { auditionId },
      include: { user: { select: { name: true, profilePhoto: true, mobile: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateApplicationStatus(recruiterId: string, applicationId: string, status: ApplicationStatus) {
    const application = await this.prisma.auditionApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { audition: true },
    });
    if (application.audition.recruiterId !== recruiterId) throw new ForbiddenException('Not your audition');

    return this.prisma.auditionApplication.update({ where: { id: applicationId }, data: { status } });
  }

  // ---- Admin moderation ----

  async adminSetStatus(id: string, status: AuditionStatus) {
    return this.prisma.audition.update({ where: { id }, data: { status } });
  }

  async pending() {
    return this.prisma.audition.findMany({ where: { status: AuditionStatus.SUBMITTED }, orderBy: { createdAt: 'asc' } });
  }
}
