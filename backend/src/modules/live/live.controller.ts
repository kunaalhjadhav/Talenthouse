import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('live')
export class LiveController {
  constructor(private liveService: LiveService) {}

  @Get()
  listLive() {
    return this.liveService.listLive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST, UserRole.TALENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  schedule(
    @CurrentUser('id') hostId: string,
    @Body('title') title: string,
    @Body('scheduledAt') scheduledAt?: string,
    @Body('contestId') contestId?: string,
    @Body('isPaid') isPaid?: boolean,
    @Body('price') price?: number,
  ) {
    return this.liveService.schedule(hostId, title, scheduledAt, contestId, isPaid, price);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  start(@CurrentUser('id') hostId: string, @Param('id') id: string) {
    return this.liveService.start(hostId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/end')
  end(@CurrentUser('id') hostId: string, @Param('id') id: string) {
    return this.liveService.end(hostId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join-token')
  joinToken(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.liveService.generateJoinToken(userId, id);
  }
}
