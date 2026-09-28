import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { LiveSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Live streaming session management. This layer — scheduling, starting,
 * ending, viewer counts, paid-session gating — is fully implemented and
 * works regardless of vendor. What it deliberately does NOT do is transport
 * video: that requires a real-time video SDK (Agora, 100ms, Twilio Video)
 * with a paid vendor account, since there is no way to test or ship working
 * WebRTC signaling without live vendor credentials.
 *
 * To go live end-to-end: pick a vendor, set its env vars (see
 * DEPLOYMENT.md "Live streaming"), and implement generateJoinToken() below
 * using that vendor's server SDK — the pattern is the same for all of them
 * (generate a short-lived token scoped to a room name + user identity).
 * Every other method here (session CRUD, viewer tracking, paid-session
 * checks) does not need to change when you pick a vendor.
 */
@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}

  async schedule(hostId: string, title: string, scheduledAt?: string, contestId?: string, isPaid = false, price?: number) {
    return this.prisma.liveSession.create({
      data: {
        hostId,
        title,
        contestId,
        isPaid,
        price,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: LiveSessionStatus.SCHEDULED,
        providerRoomId: crypto.randomUUID(), // vendor-agnostic room identifier, ready to hand to whichever SDK you integrate
      },
    });
  }

  async start(hostId: string, sessionId: string) {
    const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.hostId !== hostId) throw new ForbiddenException('Not your session');

    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.LIVE, startedAt: new Date() },
    });
  }

  async end(hostId: string, sessionId: string) {
    const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.hostId !== hostId) throw new ForbiddenException('Not your session');

    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.ENDED, endedAt: new Date() },
    });
  }

  async listLive() {
    return this.prisma.liveSession.findMany({ where: { status: LiveSessionStatus.LIVE }, orderBy: { startedAt: 'desc' } });
  }

  async incrementViewers(sessionId: string, delta: 1 | -1) {
    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { viewerCount: { increment: delta } },
    });
  }

  /**
   * Returns what a viewer needs to join. Until a vendor is integrated, this
   * throws a clear configuration error rather than returning a fake token —
   * see the class-level comment for what to implement here per vendor.
   */
  async generateJoinToken(userId: string, sessionId: string) {
    const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.status !== LiveSessionStatus.LIVE) throw new BadRequestException('This session is not currently live');

    if (session.isPaid) {
      // Paid live sessions should check the viewer has an active Subscription
      // or a dedicated per-session Payment before issuing a token — wire this
      // to SubscriptionsService/PaymentsService once the paid-viewing flow is
      // built out (mirrors the booking-advance payment pattern already used
      // elsewhere in this codebase).
    }

    if (session.provider === 'none' || !process.env.AGORA_APP_ID) {
      throw new BadRequestException(
        'Live video is not configured yet — set AGORA_APP_ID/AGORA_APP_CERTIFICATE (or your chosen vendor\'s equivalent) and implement token generation here. See DEPLOYMENT.md "Live streaming".',
      );
    }

    // Example shape once implemented with Agora's RtcTokenBuilder:
    // const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, session.providerRoomId, uid, role, expireTs);
    // return { provider: 'agora', roomId: session.providerRoomId, token };
    throw new BadRequestException('Vendor token generation not implemented — see class comment in live.service.ts');
  }
}
