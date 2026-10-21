import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

/** True only when explicitly enabled and never in production: lets you exercise every payment flow locally without Razorpay keys. */
export const devPaymentsEnabled = () => process.env.ALLOW_DEV_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';

@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;
  private getClient(): Razorpay {
    if (!this.client) this.client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID as string, key_secret: process.env.RAZORPAY_KEY_SECRET as string });
    return this.client;
  }
  private hasKeys() { return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_ID.includes('placeholder'); }
  async createOrder(amountRupees: number, receipt: string, notes?: Record<string, string>) {
    if (!this.hasKeys() && devPaymentsEnabled()) return { id: `order_dev_${crypto.randomBytes(8).toString('hex')}`, amount: Math.round(amountRupees * 100), currency: 'INR' } as any;
    return this.getClient().orders.create({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt, notes });
  }
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean { const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string).update(`${orderId}|${paymentId}`).digest('hex'); return expected === signature; }
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !signatureHeader) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected), b = Buffer.from(signatureHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  async createRefund(paymentId: string, amountRupees?: number) { return this.getClient().payments.refund(paymentId, { amount: amountRupees ? Math.round(amountRupees * 100) : undefined }); }
}
