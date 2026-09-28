import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputeType, DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private notifications: NotificationsService,
  ) {}

  async raise(raisedById: string, type: DisputeType, referenceId: string, description: string, evidenceUrls?: string[]) {
    return this.prisma.dispute.create({
      data: { raisedById, type, referenceId, description, evidenceUrls: evidenceUrls || [] },
    });
  }

  async myDisputes(userId: string) {
    return this.prisma.dispute.findMany({ where: { raisedById: userId }, orderBy: { createdAt: 'desc' } });
  }

  // ---- Admin resolution ----

  async pending() {
    return this.prisma.dispute.findMany({
      where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markUnderReview(disputeId: string) {
    return this.prisma.dispute.update({ where: { id: disputeId }, data: { status: DisputeStatus.UNDER_REVIEW } });
  }

  /**
   * Resolves a dispute. If refundToUserId + refundAmount are given, credits that
   * user's wallet directly (platform-side resolution — for actual money returned
   * via Razorpay, see PaymentsService.razorpay.createRefund, which is the
   * gateway-level refund; this wallet credit is for platform-adjudicated disputes
   * where the funds are already sitting in the platform's control, e.g. a booking
   * advance that was never released to the talent).
   */
  async resolve(
    disputeId: string,
    resolvedBy: string,
    outcome: DisputeStatus,
    resolutionNote: string,
    refund?: { userId: string; amount: number },
  ) {
    if (refund) {
      await this.wallet.credit(refund.userId, refund.amount, disputeId, `Dispute resolution refund: ${resolutionNote}`);
    }

    const dispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: outcome, resolutionNote, resolvedBy, resolvedAt: new Date() },
    });

    await this.notifications.notify(
      dispute.raisedById,
      'Dispute resolved',
      resolutionNote,
      'DISPUTE_RESOLVED',
      { disputeId, outcome },
    );

    return dispute;
  }
}
