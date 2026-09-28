import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class SocialController {
  constructor(private socialService: SocialService) {}

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/follow')
  follow(@CurrentUser('id') followerId: string, @Param('id') followingId: string) {
    return this.socialService.follow(followerId, followingId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/:id/follow')
  unfollow(@CurrentUser('id') followerId: string, @Param('id') followingId: string) {
    return this.socialService.unfollow(followerId, followingId);
  }

  @Get('users/:id/followers')
  followers(@Param('id') id: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.socialService.followers(id, Number(take) || 50, Number(skip) || 0);
  }

  @Get('users/:id/following')
  following(@Param('id') id: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.socialService.following(id, Number(take) || 50, Number(skip) || 0);
  }

  @Get('users/:id/follow-counts')
  counts(@Param('id') id: string) {
    return this.socialService.counts(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:id/is-following')
  isFollowing(@CurrentUser('id') followerId: string, @Param('id') followingId: string) {
    return this.socialService.isFollowing(followerId, followingId).then((following) => ({ following }));
  }
}
