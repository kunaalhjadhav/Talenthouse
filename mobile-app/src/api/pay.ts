import RazorpayCheckout from 'react-native-razorpay';
import { api } from './client';

/**
 * Opens the payment for an order returned by any /payments/*-order endpoint.
 * - Dev orders (server has ALLOW_DEV_PAYMENTS=true and no Razorpay keys) are confirmed
 *   directly through the API so the whole flow can be tested without a gateway.
 * - Real orders open the native Razorpay sheet. The server confirms them from the webhook.
 * Throws an error with `cancelled: true` when the user closes the sheet.
 */
export async function payOrder(data: any, description: string, mobile?: string) {
  if (data.devMode) { await api.post(`/payments/dev/confirm/${data.paymentId}`); return { dev: true }; }
  try {
    const r = await RazorpayCheckout.open({ key: data.razorpayKeyId, amount: data.order.amount, currency: data.order.currency, order_id: data.order.id, name: 'OJAS', description, prefill: { contact: mobile } });
    return { dev: false, razorpayPaymentId: r.razorpay_payment_id };
  } catch (e: any) {
    if (e?.code === 2 || (e?.description && !e?.response)) throw Object.assign(new Error('cancelled'), { cancelled: true });
    throw e;
  }
}
export const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;
export const inr = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
