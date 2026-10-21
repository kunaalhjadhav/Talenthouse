import { Body, Controller, Get, Post, Req, Headers, UseGuards, BadRequestException, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService, private razorpay: RazorpayService) {}
  @UseGuards(JwtAuthGuard) @Post('contest/:contestId/order') createContestOrder(@CurrentUser('id') userId: string, @Param('contestId') contestId: string) { return this.paymentsService.createOrderForContestRegistration(userId, contestId); }
  @UseGuards(JwtAuthGuard) @Post('booking/:bookingId/advance-order') createBookingAdvanceOrder(@CurrentUser('id') userId: string, @Param('bookingId') bookingId: string) { return this.paymentsService.createOrderForBookingAdvance(userId, bookingId); }
  @UseGuards(JwtAuthGuard) @Post('booking/:bookingId/balance-order') createBookingBalanceOrder(@CurrentUser('id') userId: string, @Param('bookingId') bookingId: string) { return this.paymentsService.createOrderForBookingBalance(userId, bookingId); }
  @UseGuards(JwtAuthGuard) @Post('votes/order') createVotePackOrder(@CurrentUser('id') userId: string, @Body('contestId') contestId: string, @Body('registrationId') registrationId: string, @Body('count') count: number) { return this.paymentsService.createOrderForVotePack(userId, contestId, registrationId, count); }
  @UseGuards(JwtAuthGuard) @Post('tip/order') createTipOrder(@CurrentUser('id') userId: string, @Body('toUserId') toUserId: string, @Body('amount') amount: number, @Body('reelId') reelId?: string) { return this.paymentsService.createOrderForTip(userId, toUserId, amount, reelId); }
  @UseGuards(JwtAuthGuard) @Post('subscription/order') createSubscriptionOrder(@CurrentUser('id') userId: string, @Body('plan') plan: any) { return this.paymentsService.createOrderForSubscription(userId, plan); }
  @UseGuards(JwtAuthGuard) @Post('dev/confirm/:paymentId') devConfirm(@CurrentUser('id') userId: string, @Param('paymentId') paymentId: string) { return this.paymentsService.devConfirm(userId, paymentId); }
  @UseGuards(JwtAuthGuard) @Get(':paymentId') status(@CurrentUser('id') userId: string, @Param('paymentId') paymentId: string) { return this.paymentsService.myPayment(userId, paymentId); }
  @Post('webhook')
  async webhook(@Req() req: any, @Headers('x-razorpay-signature') signature: string) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) throw new BadRequestException('Invalid webhook signature');
    await this.paymentsService.handleWebhookEvent(req.body);
    return { received: true };
  }
}
