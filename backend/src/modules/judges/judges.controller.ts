import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JudgesService } from './judges.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('judges')
export class JudgesController {
  constructor(private judgesService: JudgesService) {}

  // Any authenticated user (hosts included) can browse verified judges to assign to their contest.
  @UseGuards(JwtAuthGuard)
  @Get() listVerified(@Query('category') category?: string) { return this.judgesService.listVerified(category); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE)
  @Post('me/profile') upsertProfile(@CurrentUser('id') userId: string, @Body() body: any) { return this.judgesService.createOrUpdateProfile(userId, body); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE)
  @Get('me/profile') myProfile(@CurrentUser('id') userId: string) { return this.judgesService.myProfile(userId); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE)
  @Get('me/contests') myContests(@CurrentUser('id') userId: string) { return this.judgesService.myAssignedContests(userId); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE)
  @Get('me/earnings') earnings(@CurrentUser('id') userId: string) { return this.judgesService.earnings(userId); }
}
