import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay.service';
import { CommissionModule } from '../commission/commission.module';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [CommissionModule, WalletModule, ReferralsModule],
  providers: [PaymentsService, RazorpayService],
  controllers: [PaymentsController],
  exports: [PaymentsService, RazorpayService],
})
export class PaymentsModule {}
