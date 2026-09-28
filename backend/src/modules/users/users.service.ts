import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SocialService } from '../social/social.service';
import { UserStatus, UserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private socialService: SocialService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  /** Public-facing profile — deliberately omits wallet/KYC/mobile, adds follow counts. */
  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, profilePhoto: true, city: true, role: true, createdAt: true, profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const counts = await this.socialService.counts(id);
    return { ...user, ...counts };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        profilePhoto: data.profilePhoto,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  }

  // ---- Admin operations ----
  async listUsers(filters: { role?: UserRole; status?: UserStatus; search?: string }, skip = 0, take = 50) {
    return this.prisma.user.findMany({
      where: {
        role: filters.role,
        status: filters.status,
        OR: filters.search
          ? [{ name: { contains: filters.search, mode: 'insensitive' } }, { mobile: { contains: filters.search } }]
          : undefined,
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }

  async setRole(adminId: string, userId: string, role: UserRole) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'SET_ROLE',
        module: 'users',
        oldValue: { role: existing.role },
        newValue: { role },
      },
    });
    const { passwordHash: _passwordHash, ...safe } = updated;
    return safe;
  }
}
