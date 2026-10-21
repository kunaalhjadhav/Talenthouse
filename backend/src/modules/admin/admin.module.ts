import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ResourcesController } from './resources.controller';
import { ContestsModule } from '../contests/contests.module';
import { CommissionModule } from '../commission/commission.module';
import { AuditionsModule } from '../auditions/auditions.module';
import { ReelsModule } from '../reels/reels.module';
import { BookingsModule } from '../bookings/bookings.module';
import { BattlesModule } from '../battles/battles.module';
@Module({ imports: [ContestsModule, CommissionModule, AuditionsModule, ReelsModule, BookingsModule, BattlesModule], controllers: [AdminController, ResourcesController] })
export class AdminModule {}
