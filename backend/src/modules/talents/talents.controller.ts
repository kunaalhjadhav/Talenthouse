import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TalentsService } from './talents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
@Controller('talents')
export class TalentsController {
  constructor(private talentsService: TalentsService) {}
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TALENT) @Get('me/profile') myProfile(@CurrentUser('id') userId: string) { return this.talentsService.myProfile(userId); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TALENT) @Get('me/calendar') myCalendar(@CurrentUser('id') userId: string, @Query('from') from?: string, @Query('to') to?: string) { return this.talentsService.myCalendar(userId, from, to); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TALENT) @Post('me/availability') setBlocked(@CurrentUser('id') userId: string, @Body('date') date: string, @Body('blocked') blocked: boolean) { return this.talentsService.setDayBlocked(userId, date, !!blocked); }
  @Get() search(@Query('category') category?: string, @Query('city') city?: string, @Query('maxPrice') maxPrice?: string) { return this.talentsService.search({ category, city, maxPrice: maxPrice ? Number(maxPrice) : undefined }); }
  @Get(':id') getProfile(@Param('id') id: string) { return this.talentsService.getProfile(id); }
  @Get(':id/calendar') getCalendar(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string) { return this.talentsService.getCalendar(id, from, to); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TALENT) @Post('me/profile') upsertProfile(@CurrentUser('id') userId: string, @Body() body: any) { return this.talentsService.createOrUpdateProfile(userId, body); }
}
