import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { VotingService } from './voting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('voting')
export class VotingController {
  constructor(private votingService: VotingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('contests/:contestId/registrations/:registrationId/vote')
  vote(
    @CurrentUser('id') voterId: string,
    @Param('contestId') contestId: string,
    @Param('registrationId') registrationId: string,
    @Body('deviceFingerprint') deviceFingerprint: string,
    @Req() req: any,
  ) {
    return this.votingService.castFreeVote(voterId, contestId, registrationId, deviceFingerprint, req.ip);
  }

  @Get('contests/:contestId/leaderboard')
  leaderboard(@Param('contestId') contestId: string) {
    return this.votingService.contestLeaderboard(contestId);
  }
}
