import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../config/prisma.service';

const CLOSED: UserStatus[] = [UserStatus.BLOCKED, UserStatus.DELETED, UserStatus.SUSPENDED];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: { sub?: string }) {
    if (!payload?.sub) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || CLOSED.includes(user.status)) {
      throw new UnauthorizedException('This account is not active');
    }

    return { id: user.id, mobile: user.mobile, role: user.role, status: user.status };
  }
}
