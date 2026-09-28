import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('me/code')
  myCode(@CurrentUser('id') userId: string) {
    return this.referralsService.myCode(userId);
  }

  @Post('apply')
  apply(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.referralsService.recordReferral(userId, code);
  }

  @Get('me')
  myReferrals(@CurrentUser('id') userId: string) {
    return this.referralsService.myReferrals(userId);
  }
}
