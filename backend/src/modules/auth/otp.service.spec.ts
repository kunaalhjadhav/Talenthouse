import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('OtpService', () => {
  let service: OtpService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      otpCode: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OtpService);
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('creates a new OTP record when there is no recent unconsumed one', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed');
      prisma.otpCode.create.mockResolvedValueOnce({});

      const result = await service.requestOtp('9999999999');

      expect(prisma.otpCode.create).toHaveBeenCalled();
      expect(result.sent).toBe(true);
    });

    it('rejects a resend within the cooldown window', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        createdAt: new Date(), // just now — well within the 30s cooldown
        consumed: false,
      });

      await expect(service.requestOtp('9999999999')).rejects.toThrow(BadRequestException);
      expect(prisma.otpCode.create).not.toHaveBeenCalled();
    });

    it('allows a resend once the cooldown has elapsed', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        createdAt: new Date(Date.now() - 31_000), // 31s ago — past the 30s cooldown
        consumed: false,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed');
      prisma.otpCode.create.mockResolvedValueOnce({});

      const result = await service.requestOtp('9999999999');
      expect(result.sent).toBe(true);
    });
  });

  describe('verifyOtp', () => {
    it('rejects when there is no active OTP request at all', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce(null);
      await expect(service.verifyOtp('9999999999', '123456')).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired OTP even if the code is otherwise correct', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        id: 'otp1',
        expiresAt: new Date(Date.now() - 1000), // already expired
        attempts: 0,
        codeHash: 'hashed',
      });
      await expect(service.verifyOtp('9999999999', '123456')).rejects.toThrow(BadRequestException);
    });

    it('rejects after too many failed attempts, even with a valid-looking new code', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        id: 'otp1',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 5, // at MAX_ATTEMPTS
        codeHash: 'hashed',
      });
      await expect(service.verifyOtp('9999999999', '123456')).rejects.toThrow(BadRequestException);
    });

    it('increments the attempt counter on a wrong code rather than leaving it unlimited', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        id: 'otp1',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 1,
        codeHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      prisma.otpCode.update.mockResolvedValueOnce({});

      await expect(service.verifyOtp('9999999999', '000000')).rejects.toThrow(BadRequestException);
      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });

    it('succeeds and marks the OTP consumed on a correct code', async () => {
      prisma.otpCode.findFirst.mockResolvedValueOnce({
        id: 'otp1',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        codeHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      prisma.otpCode.update.mockResolvedValueOnce({});

      const result = await service.verifyOtp('9999999999', '123456');
      expect(result).toBe(true);
      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { consumed: true } }),
      );
    });

    it('a consumed OTP cannot be verified again (findFirst only returns unconsumed rows, so this is enforced at the query level — verify the query filter)', async () => {
      await service.verifyOtp('9999999999', '123456').catch(() => {});
      expect(prisma.otpCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ consumed: false }) }),
      );
    });
  });
});
