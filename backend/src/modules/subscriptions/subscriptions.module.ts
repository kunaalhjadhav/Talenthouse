import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { RazorpayService } from '../payments/razorpay.service';

// Note: provides its own RazorpayService instance rather than importing
// PaymentsModule, to avoid a circular dependency (PaymentsService needs to
// activate subscriptions on webhook receipt — see payments.service.ts —
// which would otherwise require PaymentsModule -> SubscriptionsModule ->
// PaymentsModule). RazorpayService has no injected dependencies of its own
// (just reads env vars), so a second instance is harmless.
@Module({
  providers: [SubscriptionsService, RazorpayService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
