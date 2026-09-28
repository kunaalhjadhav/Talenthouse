import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ContestsModule } from '../contests/contests.module';
import { CommissionModule } from '../commission/commission.module';
import { AuditionsModule } from '../auditions/auditions.module';
import { ReelsModule } from '../reels/reels.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ContestsModule, CommissionModule, AuditionsModule, ReelsModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
