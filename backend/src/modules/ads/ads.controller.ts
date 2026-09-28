import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AdStatus } from '@prisma/client';

@Controller('ads')
export class AdsController {
  constructor(private adsService: AdsService) {}

  @Get()
  forPlacement(@Query('placement') placement: string, @Query('category') category?: string, @Query('city') city?: string) {
    return this.adsService.forPlacement(placement, category, city);
  }

  @Post(':id/impression')
  recordImpression(@Param('id') id: string) {
    return this.adsService.recordImpression(id);
  }

  @Post(':id/click')
  recordClick(@Param('id') id: string) {
    return this.adsService.recordClick(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/all')
  list() {
    return this.adsService.list();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('admin')
  create(@Body() body: any) {
    return this.adsService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('admin/:id/status')
  setStatus(@Param('id') id: string, @Body('status') status: AdStatus) {
    return this.adsService.setStatus(id, status);
  }
}
