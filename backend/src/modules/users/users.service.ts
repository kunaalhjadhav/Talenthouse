import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SocialService } from '../social/social.service';
import { UserStatus, UserRole } from '@prisma/client';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private socialService: SocialService) {}
  async findById(id: string) { const user = await this.prisma.user.findUnique({ where: { id }, include: { profile: true, wallet: true } }); if (!user) throw new NotFoundException('User not found'); return user; }
  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, profilePhoto: true, city: true, role: true, createdAt: true, profile: true } });
    if (!user) throw new NotFoundException('User not found');
    const counts = await this.socialService.counts(id);
    return { ...user, ...counts };
  }
  async updateProfile(userId: string, data: any) { return this.prisma.user.update({ where: { id: userId }, data }); }
  async listUsers(filters: { role?: UserRole; status?: UserStatus; search?: string }, skip = 0, take = 50) {
    return this.prisma.user.findMany({ where: { role: filters.role, status: filters.status, OR: filters.search ? [{ name: { contains: filters.search, mode: 'insensitive' } }, { mobile: { contains: filters.search } }] : undefined }, skip, take, orderBy: { createdAt: 'desc' } });
  }
  async setStatus(userId: string, status: UserStatus) { return this.prisma.user.update({ where: { id: userId }, data: { status } }); }
  async setRole(userId: string, role: UserRole) { return this.prisma.user.update({ where: { id: userId }, data: { role } }); }
}
