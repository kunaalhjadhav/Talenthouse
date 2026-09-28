import { Body, Controller, Post, Req, Headers, UseGuards, BadRequestException, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private razorpay: RazorpayService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('contest/:contestId/order')
  createContestOrder(@CurrentUser('id') userId: string, @Param('contestId') contestId: string) {
    return this.paymentsService.createOrderForContestRegistration(userId, contestId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('booking/:bookingId/advance-order')
  createBookingAdvanceOrder(@CurrentUser('id') userId: string, @Param('bookingId') bookingId: string) {
    return this.paymentsService.createOrderForBookingAdvance(userId, bookingId);
  }

  /**
   * Razorpay webhook endpoint. Must receive the RAW request body for signature
   * verification — configure express.raw() for this route (see main.ts note / DEPLOYMENT.md).
   * Configure this exact URL in the Razorpay dashboard: https://api.yourdomain.com/api/v1/payments/webhook
   */
  @Post('webhook')
  async webhook(@Req() req: any, @Headers('x-razorpay-signature') signature: string) {
    const rawBody = req.rawBody?.toString();
    if (!rawBody || !signature) throw new BadRequestException('Invalid webhook signature');
    const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    await this.paymentsService.handleWebhookEvent(req.body);
    return { received: true };
  }
}
