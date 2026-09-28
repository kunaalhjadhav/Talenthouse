import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  myPlan(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.myPlan(userId);
  }

  @Post('upgrade-order')
  createUpgradeOrder(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.createUpgradeOrder(userId);
  }

  @Post('cancel')
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancel(userId);
  }
}
