import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { LiveSessionStatus } from '@prisma/client';
import * as crypto from 'crypto';
@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}
  async schedule(hostId: string, title: string, scheduledAt?: string, contestId?: string, isPaid = false, price?: number, thumbnailUrl?: string) {
    return this.prisma.liveSession.create({ data: { hostId, title, thumbnailUrl, contestId, isPaid, price, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, status: LiveSessionStatus.SCHEDULED, providerRoomId: crypto.randomUUID() } });
  }
  async start(hostId: string, sessionId: string) { const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } }); if (session.hostId !== hostId) throw new ForbiddenException('Not your session'); return this.prisma.liveSession.update({ where: { id: sessionId }, data: { status: LiveSessionStatus.LIVE, startedAt: new Date() } }); }
  async end(hostId: string, sessionId: string) { const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } }); if (session.hostId !== hostId) throw new ForbiddenException('Not your session'); return this.prisma.liveSession.update({ where: { id: sessionId }, data: { status: LiveSessionStatus.ENDED, endedAt: new Date() } }); }
  async listLive() { return this.prisma.liveSession.findMany({ where: { status: LiveSessionStatus.LIVE }, orderBy: { startedAt: 'desc' } }); }
  async incrementViewers(sessionId: string, delta: 1 | -1) { return this.prisma.liveSession.update({ where: { id: sessionId }, data: { viewerCount: { increment: delta } } }); }
  async generateJoinToken(userId: string, sessionId: string) {
    const session = await this.prisma.liveSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.status !== LiveSessionStatus.LIVE) throw new BadRequestException('This session is not currently live');
    if (session.provider === 'none' || !process.env.AGORA_APP_ID) throw new BadRequestException('Live video is not configured yet — set AGORA_APP_ID/AGORA_APP_CERTIFICATE and implement token generation.');
    throw new BadRequestException('Vendor token generation not implemented');
  }
}
