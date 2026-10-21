import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SocialService } from '../social/social.service';
import { VideoService } from './video.service';
import { CreateReelDto } from './dto';
type FeedType = 'FOR_YOU' | 'TRENDING' | 'FOLLOWING' | 'CATEGORY';
@Injectable()
export class ReelsService {
  constructor(private prisma: PrismaService, private socialService: SocialService, private videoService: VideoService) {}
  async createUploadUrl() { return this.videoService.createDirectUpload(); }
  async create(userId: string, dto: CreateReelDto & { muxUploadId?: string }) {
    if (dto.muxUploadId) { const { assetId } = await this.videoService.getUploadStatus(dto.muxUploadId); return this.prisma.reel.create({ data: { userId, category: dto.category, caption: dto.caption, hashtags: dto.hashtags, videoUrl: '', muxAssetId: assetId || undefined, status: 'PROCESSING' } }); }
    if (!dto.videoUrl) throw new BadRequestException('Either muxUploadId or videoUrl is required');
    return this.prisma.reel.create({ data: { userId, category: dto.category, caption: dto.caption, hashtags: dto.hashtags, thumbnailUrl: dto.thumbnailUrl, videoUrl: dto.videoUrl, status: 'PUBLISHED' } });
  }
  async handleMuxAssetReady(assetId: string, playbackId: string) {
    const reel = await this.prisma.reel.findFirst({ where: { muxAssetId: assetId } });
    if (!reel) return;
    await this.prisma.reel.update({ where: { id: reel.id }, data: { status: 'PUBLISHED', muxPlaybackId: playbackId, videoUrl: this.videoService.buildPlaybackUrl(playbackId), thumbnailUrl: this.videoService.buildThumbnailUrl(playbackId) } });
  }
  async handleMuxAssetErrored(assetId: string) { await this.prisma.reel.updateMany({ where: { muxAssetId: assetId }, data: { status: 'FAILED' } }); }
  async feed(type: FeedType, userId?: string, category?: string, take = 20, skip = 0) {
    const where: any = { status: 'PUBLISHED' };
    if (category) where.category = category;
    if (type === 'TRENDING') return this.prisma.reel.findMany({ where, orderBy: [{ views: 'desc' }, { likes: 'desc' }], take, skip, include: { user: { select: { name: true, profilePhoto: true } } } });
    if (type === 'CATEGORY') return this.prisma.reel.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { user: { select: { name: true, profilePhoto: true } } } });
    if (type === 'FOLLOWING') {
      if (!userId) return [];
      const followedIds = await this.socialService.followedUserIds(userId);
      if (followedIds.length === 0) return [];
      return this.prisma.reel.findMany({ where: { ...where, userId: { in: followedIds } }, orderBy: { createdAt: 'desc' }, take, skip, include: { user: { select: { name: true, profilePhoto: true } } } });
    }
    const reels = await this.prisma.reel.findMany({ where, orderBy: { createdAt: 'desc' }, take: take * 3, skip, include: { user: { select: { name: true, profilePhoto: true } } } });
    const scored = reels.map((r) => ({ reel: r, score: r.views * 1 + r.likes * 3 + r.shares * 5 - (Date.now() - r.createdAt.getTime()) / 86400000 }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, take).map((s) => s.reel);
  }
  async like(reelId: string) { return this.prisma.reel.update({ where: { id: reelId }, data: { likes: { increment: 1 } } }); }
  async recordView(reelId: string) { return this.prisma.reel.update({ where: { id: reelId }, data: { views: { increment: 1 } } }); }
  async delete(userId: string, reelId: string) { const reel = await this.prisma.reel.findUnique({ where: { id: reelId } }); if (!reel) throw new NotFoundException('Reel not found'); if (reel.userId !== userId) throw new ForbiddenException('Not your reel'); return this.prisma.reel.update({ where: { id: reelId }, data: { status: 'REMOVED' } }); }
  async report(reelId: string, reason: string) { return this.prisma.reel.update({ where: { id: reelId }, data: { status: 'UNDER_REVIEW' } }); }
  async adminModerate(reelId: string, action: 'APPROVE' | 'REMOVE') { return this.prisma.reel.update({ where: { id: reelId }, data: { status: action === 'APPROVE' ? 'PUBLISHED' : 'REMOVED' } }); }
  async pendingReview() { return this.prisma.reel.findMany({ where: { status: 'UNDER_REVIEW' }, orderBy: { createdAt: 'asc' } }); }
}
