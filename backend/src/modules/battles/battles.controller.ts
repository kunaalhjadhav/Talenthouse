import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BattlesService } from './battles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('battles')
export class BattlesController {
  constructor(private battles: BattlesService) {}
  @Get() list() { return this.battles.list('LIVE'); }
  @UseGuards(JwtAuthGuard) @Get('me/votes') myVotes(@CurrentUser('id') userId: string) { return this.battles.myVotes(userId); }
  @UseGuards(JwtAuthGuard) @Post(':id/vote') vote(@CurrentUser('id') userId: string, @Param('id') id: string, @Body('side') side: 'A' | 'B') { return this.battles.vote(userId, id, side); }
}
