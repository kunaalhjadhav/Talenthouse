import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { EngagementService } from '../engagement/engagement.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BattlesService {
  constructor(private prisma: PrismaService, private engagement: EngagementService, private notifications: NotificationsService) {}

  private async decorate(battles: any[]) {
    const reelIds = battles.flatMap((b) => [b.reelAId, b.reelBId]);
    const reels = await this.prisma.reel.findMany({ where: { id: { in: reelIds } }, include: { user: { select: { id: true, name: true, profilePhoto: true } } } });
    const byId = Object.fromEntries(reels.map((r) => [r.id, r]));
    return battles.map((b) => {
      const total = b.votesA + b.votesB;
      return { ...b, reelA: byId[b.reelAId] ?? null, reelB: byId[b.reelBId] ?? null, totalVotes: total, pctA: total ? Math.round((b.votesA / total) * 100) : 50 };
    });
  }

  async create(dto: { title: string; reelAId: string; reelBId: string; endsAt?: string }) {
    if (!dto.title || !dto.reelAId || !dto.reelBId) throw new BadRequestException('title, reelAId and reelBId are required');
    if (dto.reelAId === dto.reelBId) throw new BadRequestException('Pick two different reels');
    const found = await this.prisma.reel.count({ where: { id: { in: [dto.reelAId, dto.reelBId] } } });
    if (found !== 2) throw new NotFoundException('One of the reels does not exist');
    const battle = await this.prisma.battle.create({ data: { title: dto.title, reelAId: dto.reelAId, reelBId: dto.reelBId, endsAt: dto.endsAt ? new Date(dto.endsAt) : null } });
    return (await this.decorate([battle]))[0];
  }

  async list(status?: string) { return this.decorate(await this.prisma.battle.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: 'desc' }, take: 50 })); }

  async myVotes(userId: string) { const rows = await this.prisma.battleVote.findMany({ where: { voterId: userId } }); return Object.fromEntries(rows.map((r) => [r.battleId, r.side])); }

  async vote(userId: string, battleId: string, side: 'A' | 'B') {
    if (side !== 'A' && side !== 'B') throw new BadRequestException('side must be A or B');
    const battle = await this.prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== 'LIVE' || (battle.endsAt && battle.endsAt < new Date())) throw new BadRequestException('This battle has ended');
    try { await this.prisma.battleVote.create({ data: { battleId, voterId: userId, side } }); }
    catch { throw new ConflictException('You have already voted in this battle'); }
    const updated = await this.prisma.battle.update({ where: { id: battleId }, data: side === 'A' ? { votesA: { increment: 1 } } : { votesB: { increment: 1 } } });
    await this.engagement.awardXp(userId, 'BATTLE_VOTE');
    return { ...(await this.decorate([updated]))[0], voted: side };
  }

  async close(battleId: string) {
    const battle = await this.prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status === 'CLOSED') return (await this.decorate([battle]))[0];
    const winnerReelId = battle.votesA >= battle.votesB ? battle.reelAId : battle.reelBId;
    const updated = await this.prisma.battle.update({ where: { id: battleId }, data: { status: 'CLOSED', winnerReelId } });
    const reel = await this.prisma.reel.findUnique({ where: { id: winnerReelId } });
    if (reel) {
      await this.engagement.award(reel.userId, 'crowd');
      await this.notifications.notify(reel.userId, 'You won the battle', `Your reel won "${battle.title}".`, 'BATTLE_WON', { battleId });
    }
    return (await this.decorate([updated]))[0];
  }
}
