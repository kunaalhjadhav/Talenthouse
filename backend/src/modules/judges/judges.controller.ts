import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JudgesService } from './judges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.JUDGE)
@Controller('judges')
export class JudgesController {
  constructor(private judgesService: JudgesService) {}

  @Post('me/profile')
  upsertProfile(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.judgesService.createOrUpdateProfile(userId, body);
  }

  @Get('me/profile')
  myProfile(@CurrentUser('id') userId: string) {
    return this.judgesService.myProfile(userId);
  }

  @Get('me/contests')
  myContests(@CurrentUser('id') userId: string) {
    return this.judgesService.myAssignedContests(userId);
  }

  @Get('me/earnings')
  earnings(@CurrentUser('id') userId: string) {
    return this.judgesService.earnings(userId);
  }
}
