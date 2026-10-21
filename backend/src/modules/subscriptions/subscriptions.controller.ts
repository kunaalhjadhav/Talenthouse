import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService, private payments: PaymentsService) {}
  @Get('me') myPlan(@CurrentUser('id') userId: string) { return this.subscriptionsService.myPlan(userId); }
  /** Body: { plan: 'PREMIUM' | 'PRO' }. Price comes from admin settings. */
  @Post('upgrade-order') createUpgradeOrder(@CurrentUser('id') userId: string, @Body('plan') plan: any) { return this.payments.createOrderForSubscription(userId, plan || 'PREMIUM'); }
  @Post('cancel') cancel(@CurrentUser('id') userId: string) { return this.subscriptionsService.cancel(userId); }
}
