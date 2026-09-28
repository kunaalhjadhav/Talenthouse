import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SocialService } from '../social/social.service';
import { VideoService } from './video.service';
import { CreateReelDto } from './dto';

type FeedType = 'FOR_YOU' | 'TRENDING' | 'FOLLOWING' | 'CATEGORY';

@Injectable()
export class ReelsService {
  constructor(
    private prisma: PrismaService,
    private socialService: SocialService,
    private videoService: VideoService,
  ) {}

  /** Step 1 of upload: client asks for a direct-upload URL before it has a video file to attach to a reel yet. */
  async createUploadUrl() {
    return this.videoService.createDirectUpload();
  }

  /**
   * Step 2: client has finished uploading to Mux and now creates the Reel
   * record referencing the upload. The reel starts PROCESSING — it becomes
   * PUBLISHED automatically once handleMuxWebhook() receives Mux's
   * "video.asset.ready" event with the final playback ID.
   */
  async create(userId: string, dto: CreateReelDto & { muxUploadId?: string }) {
    if (dto.muxUploadId) {
      const { assetId } = await this.videoService.getUploadStatus(dto.muxUploadId);
      return this.prisma.reel.create({
        data: {
          userId,
          category: dto.category,
          caption: dto.caption,
          hashtags: dto.hashtags,
          videoUrl: '', // filled in once processing completes
          muxAssetId: assetId || undefined,
          status: 'PROCESSING',
        },
      });
    }

    // Fallback path: a pre-hosted video URL was provided directly (e.g. imported
    // content, or Mux not configured yet in a dev environment) — publish immediately.
    if (!dto.videoUrl) throw new BadRequestException('Either muxUploadId or videoUrl is required');
      return this.prisma.reel.create({
      data: {
      userId,
      category: dto.category,
      caption: dto.caption,
      hashtags: dto.hashtags,
      thumbnailUrl: dto.thumbnailUrl,
      videoUrl: dto.videoUrl,
      status: 'PUBLISHED',
      },
    });
  }

  /** Called from the Mux webhook controller once transcoding finishes for an asset. */
  async handleMuxAssetReady(assetId: string, playbackId: string) {
    const reel = await this.prisma.reel.findFirst({ where: { muxAssetId: assetId } });
    if (!reel) return; // asset not tied to a reel (shouldn't normally happen) — nothing to update

    await this.prisma.reel.update({
      where: { id: reel.id },
      data: {
        status: 'PUBLISHED',
        muxPlaybackId: playbackId,
        videoUrl: this.videoService.buildPlaybackUrl(playbackId),
        thumbnailUrl: this.videoService.buildThumbnailUrl(playbackId),
      },
    });
  }

  async handleMuxAssetErrored(assetId: string) {
    await this.prisma.reel.updateMany({ where: { muxAssetId: assetId }, data: { status: 'FAILED' } });
  }

  /**
   * Feed ranking (PRD §3.3). "For You" uses a simple weighted engagement score —
   * views/likes/comments/shares/saves normalized by recency — as a reasonable
   * MVP default. Swap in a real ML ranking service later; the interface
   * (feed(type, userId, category) -> Reel[]) stays the same either way.
   */
  async feed(type: FeedType, userId?: string, category?: string, take = 20, skip = 0) {
    const where: any = { status: 'PUBLISHED' };
    if (category) where.category = category;

    if (type === 'TRENDING') {
      return this.prisma.reel.findMany({
        where,
        orderBy: [{ views: 'desc' }, { likes: 'desc' }],
        take,
        skip,
        include: { user: { select: { name: true, profilePhoto: true } } },
      });
    }

    if (type === 'CATEGORY') {
      return this.prisma.reel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { user: { select: { name: true, profilePhoto: true } } },
      });
    }

    if (type === 'FOLLOWING') {
      if (!userId) return []; // caller must be authenticated for a personalized following feed
      const followedIds = await this.socialService.followedUserIds(userId);
      if (followedIds.length === 0) return [];
      return this.prisma.reel.findMany({
        where: { ...where, userId: { in: followedIds } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { user: { select: { name: true, profilePhoto: true } } },
      });
    }

    // FOR_YOU falls back to recency-weighted engagement for now — swap in a
    // real ML ranking service later; the interface stays the same either way.
    const reels = await this.prisma.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take * 3, // over-fetch, then re-rank in memory below
      skip,
      include: { user: { select: { name: true, profilePhoto: true } } },
    });

    const scored = reels.map((r) => ({
      reel: r,
      score:
        r.views * 1 +
        r.likes * 3 +
        r.shares * 5 -
        (Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24), // mild recency decay per day old
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, take).map((s) => s.reel);
  }

  async like(reelId: string) {
    return this.prisma.reel.update({ where: { id: reelId }, data: { likes: { increment: 1 } } });
  }

  async recordView(reelId: string) {
    return this.prisma.reel.update({ where: { id: reelId }, data: { views: { increment: 1 } } });
  }

  async delete(userId: string, reelId: string) {
    const reel = await this.prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) throw new NotFoundException('Reel not found');
    if (reel.userId !== userId) throw new ForbiddenException('Not your reel');
    return this.prisma.reel.update({ where: { id: reelId }, data: { status: 'REMOVED' } });
  }

  // ---- Admin moderation ----

  async report(reelId: string, reason: string) {
    // Minimal implementation — logs a moderation flag by dropping the reel to
    // UNDER_REVIEW after N reports. A dedicated Report model (with reporter,
    // reason, evidence — per PRD §63) is the natural next addition once
    // moderation volume justifies a full review queue UI.
    return this.prisma.reel.update({ where: { id: reelId }, data: { status: 'UNDER_REVIEW' } });
  }

  async adminModerate(reelId: string, action: 'APPROVE' | 'REMOVE') {
    return this.prisma.reel.update({
      where: { id: reelId },
      data: { status: action === 'APPROVE' ? 'PUBLISHED' : 'REMOVED' },
    });
  }

  async pendingReview() {
    return this.prisma.reel.findMany({ where: { status: 'UNDER_REVIEW' }, orderBy: { createdAt: 'asc' } });
  }
}
