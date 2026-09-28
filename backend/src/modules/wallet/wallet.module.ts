import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { KycService } from './kyc.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [WalletService, KycService],
  controllers: [WalletController],
  exports: [WalletService, KycService],
})
export class WalletModule {}
