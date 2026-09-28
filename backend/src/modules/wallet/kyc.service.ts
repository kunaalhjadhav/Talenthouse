import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { KycStatus } from '@prisma/client';
import { SubmitKycDto } from './kyc.dto';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async submit(userId: string, dto: SubmitKycDto) {
    return this.prisma.kyc.upsert({
      where: { userId },
      create: { userId, ...dto, status: KycStatus.PENDING, submittedAt: new Date() },
      update: { ...dto, status: KycStatus.PENDING, submittedAt: new Date(), rejectionNote: null },
    });
  }

  async myKyc(userId: string) {
    return this.prisma.kyc.findUnique({ where: { userId } });
  }

  // ---- Admin review ----

  async pending() {
    return this.prisma.kyc.findMany({
      where: { status: KycStatus.PENDING },
      include: { user: { select: { name: true, mobile: true, role: true } } },
      orderBy: { submittedAt: 'asc' },
    });
  }

  async approve(kycId: string) {
    return this.prisma.kyc.update({ where: { id: kycId }, data: { status: KycStatus.APPROVED, reviewedAt: new Date() } });
  }

  async reject(kycId: string, reason: string) {
    return this.prisma.kyc.update({
      where: { id: kycId },
      data: { status: KycStatus.REJECTED, rejectionNote: reason, reviewedAt: new Date() },
    });
  }

  async assertApproved(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== KycStatus.APPROVED) {
      throw new ForbiddenException('KYC must be submitted and approved before you can withdraw funds');
    }
  }
}
