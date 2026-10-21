import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { buildSendXml, parseSendResponse, renderTemplate, toIndianMobile } from './smslocal.util';
const ENDPOINT = 'https://app.smslocal.in/api/smsxml';
const TIMEOUT_MS = 10_000;
const USER_MESSAGE = 'Could not send the OTP right now. Please try again shortly.';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private get config() {
    return { key: process.env.SMSLOCAL_API_KEY, senderId: process.env.SMSLOCAL_SENDER_ID, route: process.env.SMSLOCAL_ROUTE, templateId: process.env.SMSLOCAL_DLT_TEMPLATE_ID, template: process.env.SMSLOCAL_OTP_TEMPLATE };
  }
  get configured(): boolean { const c = this.config; return !!(c.key && c.senderId && c.route && c.templateId && c.template); }
  get shouldSend(): boolean { return this.configured && (process.env.NODE_ENV === 'production' || process.env.SMS_SEND_IN_DEV === 'true'); }
  async sendOtp(mobile: string, otp: string): Promise<void> {
    const c = this.config;
    const number = toIndianMobile(mobile);
    if (!number) throw new BadRequestException('Enter a valid 10-digit Indian mobile number');
    const xml = buildSendXml({ key: c.key as string, sms: renderTemplate(c.template as string, { otp }), templateId: c.templateId as string, senderId: c.senderId as string, route: c.route as string, numbers: [number] });
    const url = `${ENDPOINT}?xml=${encodeURIComponent(xml)}`;
    let responseText: string;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) { this.logger.error(`SMSLocal returned HTTP ${res.status}`); throw new ServiceUnavailableException(USER_MESSAGE); }
      responseText = await res.text();
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      const err = e as { name?: string; cause?: { code?: string } };
      this.logger.error(`Could not reach SMSLocal: ${err.name} ${err.cause?.code ?? ''}`);
      throw new ServiceUnavailableException(USER_MESSAGE);
    }
    const result = parseSendResponse(responseText);
    if (!result.ok) { this.logger.error(`SMSLocal rejected: code ${result.code} (${result.reason})`); throw new ServiceUnavailableException(USER_MESSAGE); }
    this.logger.log(`OTP SMS accepted by SMSLocal (message id ${result.messageId})`);
  }
}
