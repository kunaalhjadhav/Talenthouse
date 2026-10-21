import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './config/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CommissionModule } from './modules/commission/commission.module';
import { ContestsModule } from './modules/contests/contests.module';
import { TalentsModule } from './modules/talents/talents.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { VotingModule } from './modules/voting/voting.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditionsModule } from './modules/auditions/auditions.module';
import { ReelsModule } from './modules/reels/reels.module';
import { SocialModule } from './modules/social/social.module';
import { JudgesModule } from './modules/judges/judges.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdsModule } from './modules/ads/ads.module';
import { LiveModule } from './modules/live/live.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './modules/settings/settings.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { BattlesModule } from './modules/battles/battles.module';
import { PublicModule } from './modules/public/public.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule, SettingsModule, EngagementModule,
    AuthModule, UsersModule, WalletModule, CommissionModule, ContestsModule, TalentsModule, BookingsModule,
    VotingModule, PaymentsModule, AdminModule, AuditionsModule, ReelsModule, SocialModule, JudgesModule,
    ChatModule, NotificationsModule, RatingsModule, DisputesModule, ReferralsModule, SubscriptionsModule, AdsModule, LiveModule, BattlesModule, PublicModule, TasksModule,
    UploadsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
