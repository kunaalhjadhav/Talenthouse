import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, BadRequestException, Headers } from '@nestjs/common';
import { ReelsService } from './reels.service';
import { VideoService } from './video.service';
import { CreateReelDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('reels')
export class ReelsController {
  constructor(private reelsService: ReelsService, private videoService: VideoService) {}
  @UseGuards(JwtAuthGuard) @Post('upload-url') createUploadUrl() { return this.reelsService.createUploadUrl(); }
  @UseGuards(OptionalJwtAuthGuard) @Get('feed')
  feed(@Req() req: any, @Query('type') type: 'FOR_YOU' | 'TRENDING' | 'FOLLOWING' | 'CATEGORY' = 'FOR_YOU', @Query('category') category?: string, @Query('take') take?: string, @Query('skip') skip?: string) { return this.reelsService.feed(type, req.user?.id, category, Number(take) || 20, Number(skip) || 0); }
  @UseGuards(JwtAuthGuard) @Post() create(@CurrentUser('id') userId: string, @Body() dto: CreateReelDto) { return this.reelsService.create(userId, dto); }
  @Post(':id/view') view(@Param('id') id: string) { return this.reelsService.recordView(id); }
  @UseGuards(JwtAuthGuard) @Post(':id/like') like(@Param('id') id: string) { return this.reelsService.like(id); }
  @UseGuards(JwtAuthGuard) @Post(':id/report') report(@Param('id') id: string, @Body('reason') reason: string) { return this.reelsService.report(id, reason); }
  @UseGuards(JwtAuthGuard) @Delete(':id') delete(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.reelsService.delete(userId, id); }
  @Post('mux-webhook')
  async muxWebhook(@Req() req: any, @Headers('mux-signature') signature: string) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    if (!this.videoService.verifyWebhookSignature(rawBody, signature)) throw new BadRequestException('Invalid Mux webhook signature');
    const event = req.body;
    if (event.type === 'video.asset.ready') { const playbackId = event.data.playback_ids?.[0]?.id; if (playbackId) await this.reelsService.handleMuxAssetReady(event.data.id, playbackId); }
    else if (event.type === 'video.asset.errored') await this.reelsService.handleMuxAssetErrored(event.data.id);
    return { received: true };
  }
}
