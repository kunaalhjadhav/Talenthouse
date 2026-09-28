import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuditionsService } from './auditions.service';
import { CreateAuditionDto, ApplyToAuditionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ApplicationStatus } from '@prisma/client';

@Controller('auditions')
export class AuditionsController {
  constructor(private auditionsService: AuditionsService) {}

  @Get()
  findAll(@Query('category') category?: string, @Query('location') location?: string) {
    return this.auditionsService.findLive({ category, location });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/applications')
  myApplications(@CurrentUser('id') userId: string) {
    return this.auditionsService.myApplications(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('me/posted')
  myPostedAuditions(@CurrentUser('id') recruiterId: string) {
    return this.auditionsService.findByRecruiter(recruiterId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@CurrentUser('id') recruiterId: string, @Body() dto: CreateAuditionDto) {
    return this.auditionsService.create(recruiterId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/apply')
  apply(@CurrentUser('id') userId: string, @Param('id') auditionId: string, @Body() dto: ApplyToAuditionDto) {
    return this.auditionsService.apply(userId, auditionId, dto.portfolioUrls, dto.resumeUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER)
  @Get(':id/applications')
  recruiterApplications(@CurrentUser('id') recruiterId: string, @Param('id') auditionId: string) {
    return this.auditionsService.recruiterApplications(recruiterId, auditionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECRUITER)
  @Patch('applications/:applicationId/status')
  updateApplicationStatus(
    @CurrentUser('id') recruiterId: string,
    @Param('applicationId') applicationId: string,
    @Body('status') status: ApplicationStatus,
  ) {
    return this.auditionsService.updateApplicationStatus(recruiterId, applicationId, status);
  }
}
