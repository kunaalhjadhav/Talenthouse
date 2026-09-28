import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /** Liveness for Compose and Nginx. Does not call Razorpay or other vendors. */
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
