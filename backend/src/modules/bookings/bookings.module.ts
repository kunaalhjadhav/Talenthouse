import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TalentsModule } from '../talents/talents.module';
import { CommissionModule } from '../commission/commission.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TalentsModule, CommissionModule, NotificationsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
})
export class BookingsModule {}
