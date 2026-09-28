import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, BadRequestException, Headers } from '@nestjs/common';
import { ReelsService } from './reels.service';
import { VideoService } from './video.service';
import { CreateReelDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reels')
export class ReelsController {
  constructor(
    private reelsService: ReelsService,
    private videoService: VideoService,
  ) {}

  /** Step 1 of upload flow — call this first, upload the raw video file to the returned uploadUrl, then POST /reels with the returned uploadId as muxUploadId. */
  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  createUploadUrl() {
    return this.reelsService.createUploadUrl();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  feed(
    @Req() req: any,
    @Query('type') type: 'FOR_YOU' | 'TRENDING' | 'FOLLOWING' | 'CATEGORY' = 'FOR_YOU',
    @Query('category') category?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    // OptionalJwtAuthGuard populates req.user when a valid token is sent, but never
    // throws when one isn't — so FOR_YOU/TRENDING/CATEGORY stay open to anonymous
    // browsing while FOLLOWING (which needs an identity) degrades to an empty list
    // for anonymous callers, handled in ReelsService.feed().
    const userId = req.user?.id;
    return this.reelsService.feed(type, userId, category, Number(take) || 20, Number(skip) || 0);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReelDto) {
    return this.reelsService.create(userId, dto);
  }

  @Post(':id/view')
  view(@Param('id') id: string) {
    return this.reelsService.recordView(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.reelsService.like(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  report(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reelsService.report(id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.reelsService.delete(userId, id);
  }

  /**
   * Mux webhook — configure this exact URL in the Mux dashboard:
   * https://api.yourdomain.com/api/v1/reels/mux-webhook
   * Needs the RAW request body for signature verification, same pattern as
   * the Razorpay webhook — see main.ts's express.raw() middleware setup.
   */
  @Post('mux-webhook')
  async muxWebhook(@Req() req: any, @Headers('mux-signature') signature: string) {
    const rawBody = req.rawBody?.toString();
    if (!rawBody || !signature || !this.videoService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid Mux webhook signature');
    }

    const event = req.body;
    if (event.type === 'video.asset.ready') {
      const assetId = event.data.id;
      const playbackId = event.data.playback_ids?.[0]?.id;
      if (playbackId) await this.reelsService.handleMuxAssetReady(assetId, playbackId);
    } else if (event.type === 'video.asset.errored') {
      await this.reelsService.handleMuxAssetErrored(event.data.id);
    }

    return { received: true };
  }
}
