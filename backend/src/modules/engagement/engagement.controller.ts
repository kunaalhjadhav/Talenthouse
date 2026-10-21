import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EngagementService, BADGES, LEVELS } from './engagement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('engagement')
export class EngagementController {
  constructor(private engagement: EngagementService) {}
  @UseGuards(JwtAuthGuard) @Get('me') me(@CurrentUser('id') userId: string) { return this.engagement.me(userId); }
  @UseGuards(JwtAuthGuard) @Post('check-in') checkIn(@CurrentUser('id') userId: string) { return this.engagement.checkIn(userId); }
  @Get('leaderboard') leaderboard(@Query('take') take?: string) { return this.engagement.leaderboard(take ? Number(take) : 20); }
  @Get('definitions') definitions() { return { badges: BADGES, levels: LEVELS }; }
}
