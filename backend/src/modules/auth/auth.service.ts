import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';
import { OtpService } from './otp.service';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private jwt: JwtService,
  ) {}

  async requestOtp(mobile: string) {
    return this.otpService.requestOtp(mobile, 'LOGIN');
  }

  /** Verifies OTP, creates the user on first login, issues access+refresh tokens. */
  async verifyOtpAndLogin(mobile: string, code: string, deviceId?: string) {
    await this.otpService.verifyOtp(mobile, code, 'LOGIN');

    let user = await this.prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          mobile,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          wallet: { create: {} },
        },
      });
    } else if (
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('This account is not active. Contact support.');
    } else if (user.status === UserStatus.PENDING_VERIFICATION) {
      await this.prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE } });
    }

    return this.issueTokens(user.id, user.mobile, user.role, deviceId);
  }

  async issueTokens(userId: string, mobile: string, role: UserRole, deviceId?: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, mobile, role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' },
    );

    const refreshTokenRaw = await this.jwt.signAsync(
      { sub: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' },
    );

    const tokenHash = await bcrypt.hash(refreshTokenRaw, 8);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, deviceId, expiresAt },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: { id: userId, mobile, role },
    };
  }

  async refresh(refreshTokenRaw: string) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshTokenRaw, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    if (
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('This account is not active. Contact support.');
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId: user.id, revoked: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let matched = false;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshTokenRaw, t.tokenHash)) {
        matched = true;
        await this.prisma.refreshToken.update({ where: { id: t.id }, data: { revoked: true } });
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Refresh token not recognized (possibly reused/revoked)');

    return this.issueTokens(user.id, user.mobile, user.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { loggedOut: true };
  }
}
