import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayService {
  private client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }

  /** Creates a Razorpay order. Amount is in rupees; Razorpay expects paise. */
  async createOrder(amountRupees: number, receipt: string, notes?: Record<string, string>) {
    return this.client.orders.create({
      amount: Math.round(amountRupees * 100),
      currency: 'INR',
      receipt,
      notes,
    });
  }

  /** Verifies the signature returned to the client after checkout (defense in depth — webhook is the source of truth). */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  /** Verifies an incoming webhook's signature. This is the ONLY trusted source for payment-status changes. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string)
      .update(rawBody)
      .digest('hex');
    return expected === signatureHeader;
  }

  async createRefund(paymentId: string, amountRupees?: number) {
    return this.client.payments.refund(paymentId, {
      amount: amountRupees ? Math.round(amountRupees * 100) : undefined,
    });
  }

  /** Payouts to hosts/judges/talents. Requires RazorpayX; falls back to manual bank transfer if not configured. */
  async createPayout(fundAccountId: string, amountRupees: number, purpose: string) {
    // Placeholder for RazorpayX Payouts API integration — requires a separate
    // RazorpayX account and fund_account setup per payee (see DEPLOYMENT.md).
    throw new Error(
      'RazorpayX payouts not configured. See DEPLOYMENT.md "Configuring Payouts" section.',
    );
  }
}
