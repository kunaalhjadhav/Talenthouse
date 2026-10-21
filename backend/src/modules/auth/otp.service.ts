import { Injectable, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';
import { SmsService } from './sms.service';
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OtpService');
  constructor(private prisma: PrismaService, private sms: SmsService) {}
  private generateCode(): string { return randomInt(100000, 1000000).toString(); }
  async requestOtp(mobile: string, purpose = 'LOGIN') {
    const recent = await this.prisma.otpCode.findFirst({ where: { mobile, purpose, consumed: false }, orderBy: { createdAt: 'desc' } });
    if (recent) {
      const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) throw new BadRequestException(`Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)}s before requesting another OTP`);
    }
    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const record = await this.prisma.otpCode.create({ data: { mobile, codeHash, purpose, expiresAt } });
    if (this.sms.shouldSend) {
      try { await this.sms.sendOtp(mobile, code); } catch (e) { await this.discard(record.id); throw e; }
    } else if (process.env.NODE_ENV === 'production') {
      await this.discard(record.id);
      this.logger.error('SMS is not configured. OTP was not sent.');
      throw new ServiceUnavailableException('Could not send the OTP right now. Please try again shortly.');
    } else { this.logger.debug(`[DEV ONLY] OTP for ${mobile}: ${code}`); }
    return { sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }
  private async discard(id: string) { await this.prisma.otpCode.delete({ where: { id } }).catch(() => undefined); }
  async verifyOtp(mobile: string, code: string, purpose = 'LOGIN') {
    const record = await this.prisma.otpCode.findFirst({ where: { mobile, purpose, consumed: false }, orderBy: { createdAt: 'desc' } });
    if (!record) throw new BadRequestException('No active OTP found. Please request a new one.');
    if (record.expiresAt < new Date()) throw new BadRequestException('OTP has expired');
    if (record.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many attempts. Request a new OTP.');
    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) { await this.prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } }); throw new BadRequestException('Invalid OTP'); }
    await this.prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
    return true;
  }
}
