import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { CreateContestDto, ScoreDto, UpdateContestFinancialsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('contests')
export class ContestsController {
  constructor(private contestsService: ContestsService) {}
  @Get() findAll(@Query('category') category?: string, @Query('mode') mode?: string, @Query('city') city?: string) { return this.contestsService.findPublished({ category, mode, city }); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.HOST) @Get('me/hosted') myHostedContests(@CurrentUser('id') hostId: string) { return this.contestsService.findByHost(hostId); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE) @Get(':id/judge-state') judgeState(@CurrentUser('id') judgeUserId: string, @Param('id') id: string) { return this.contestsService.judgeState(judgeUserId, id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.contestsService.findOne(id); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN) @Post() create(@CurrentUser('id') hostId: string, @Body() dto: CreateContestDto) { return this.contestsService.create(hostId, dto); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.HOST) @Get(':id/registrations') registrationsForHost(@CurrentUser('id') hostId: string, @Param('id') contestId: string) { return this.contestsService.registrationsForHost(hostId, contestId); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN) @Post(':id/judges') assignJudge(@CurrentUser('id') hostId: string, @Param('id') contestId: string, @Body('judgeProfileId') judgeProfileId: string, @Body('feeAgreed') feeAgreed?: number) { return this.contestsService.assignJudgeAsHost(hostId, contestId, judgeProfileId, feeAgreed); }
  @UseGuards(JwtAuthGuard) @Post(':id/register') registerFree(@CurrentUser('id') userId: string, @Param('id') contestId: string) { return this.contestsService.registerFree(userId, contestId); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE) @Post('registrations/:registrationId/score') score(@CurrentUser('id') judgeUserId: string, @Param('registrationId') registrationId: string, @Body() dto: ScoreDto) { return this.contestsService.submitJudgeScore(judgeUserId, registrationId, dto.criterion, dto.score, dto.comment); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN) @Post(':id/settle') settle(@CurrentUser('id') callerId: string, @Param('id') id: string) { return this.contestsService.settleContest(id, callerId); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.CONTEST_MANAGER) @Patch(':id/financials') updateFinancials(@Param('id') id: string, @Body() dto: UpdateContestFinancialsDto) { return this.contestsService.adminUpdateFinancials(id, dto); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE) @Post('registrations/:registrationId/feedback') feedback(@CurrentUser('id') judgeUserId: string, @Param('registrationId') registrationId: string, @Body('feedback') feedback: string) { return this.contestsService.submitJudgeFeedback(judgeUserId, registrationId, feedback); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.JUDGE) @Post('registrations/:registrationId/golden-buzzer') buzzer(@CurrentUser('id') judgeUserId: string, @Param('registrationId') registrationId: string) { return this.contestsService.goldenBuzzer(judgeUserId, registrationId); }
}
