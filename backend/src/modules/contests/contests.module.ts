import { Module } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { ContestsController } from './contests.controller';
import { CommissionModule } from '../commission/commission.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CommissionModule, WalletModule, NotificationsModule],
  providers: [ContestsService],
  controllers: [ContestsController],
  exports: [ContestsService],
})
export class ContestsModule {}
