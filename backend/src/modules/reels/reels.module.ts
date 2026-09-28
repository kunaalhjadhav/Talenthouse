import { Module } from '@nestjs/common';
import { ReelsService } from './reels.service';
import { ReelsController } from './reels.controller';
import { VideoService } from './video.service';
import { SocialModule } from '../social/social.module';

@Module({
  imports: [SocialModule],
  providers: [ReelsService, VideoService],
  controllers: [ReelsController],
  exports: [ReelsService],
})
export class ReelsModule {}
