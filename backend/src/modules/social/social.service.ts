import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException('You cannot follow yourself');

    try {
      return await this.prisma.follow.create({ data: { followerId, followingId } });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Already following this user');
      throw e;
    }
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { unfollowed: true };
  }

  async isFollowing(followerId: string, followingId: string) {
    const record = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!record;
  }

  async followers(userId: string, take = 50, skip = 0) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, profilePhoto: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async following(userId: string, take = 50, skip = 0) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: { followingUser: { select: { id: true, name: true, profilePhoto: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async counts(userId: string) {
    const [followers, following] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }

  /** Used by ReelsService for the "Following" feed — returns the set of user IDs the given user follows. */
  async followedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }
}
