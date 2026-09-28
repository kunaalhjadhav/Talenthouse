import { Injectable, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcryptjs';

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OtpService');

  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  /** Dev logs the code. Production sends it and refuses to pretend success if SMS is not configured. */
  private async deliverOtp(mobile: string, code: string) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      this.logger.debug(`[DEV ONLY] OTP for ${mobile}: ${code}`);
    }

    const apiKey = process.env.SMS_PROVIDER_API_KEY;
    const url = process.env.SMS_PROVIDER_URL;
    const configured = !!apiKey && apiKey !== 'CHANGE_ME' && !!url;
    if (!configured) {
      if (isProd) {
        throw new ServiceUnavailableException('SMS provider is not configured');
      }
      return;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: mobile,
        sender: process.env.SMS_SENDER_ID || 'TALENT',
        message: `Your Talenthouse login code is ${code}`,
      }),
    });
    if (!response.ok) {
      this.logger.error(`SMS provider returned HTTP ${response.status}`);
      throw new ServiceUnavailableException('Could not send OTP');
    }
  }

  async requestOtp(mobile: string, purpose = 'LOGIN') {
    const recent = await this.prisma.otpCode.findFirst({
      where: { mobile, purpose, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another OTP`,
        );
      }
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { mobile, codeHash, purpose, expiresAt },
    });

    await this.deliverOtp(mobile, code);

    return { sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }

  async verifyOtp(mobile: string, code: string, purpose = 'LOGIN') {
    const record = await this.prisma.otpCode.findFirst({
      where: { mobile, purpose, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('No active OTP found. Please request a new one.');
    if (record.expiresAt < new Date()) throw new BadRequestException('OTP has expired');
    if (record.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many attempts. Request a new OTP.');

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    return true;
  }
}
