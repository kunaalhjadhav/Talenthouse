const ERROR_CODES: Record<string, string> = {
  '101': 'Invalid user (check the API key)', '102': 'Invalid sender ID', '103': 'Invalid contact(s)',
  '104': 'Invalid route', '105': 'Invalid message', '106': 'Spam blocked', '107': 'Promotional block',
  '108': 'Low credits in the specified route', '109': 'Promotional route only works 9am to 8:45pm',
  '110': 'Invalid DLT template ID', '111': 'No SMSC',
};
export type SendResult = { ok: true; messageId: string } | { ok: false; code: string; reason: string };
export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
export function buildSendXml(p: { key: string; sms: string; templateId: string; senderId: string; route: string; numbers: string[] }): string {
  const numbers = p.numbers.map((n) => `<number>${escapeXml(n)}</number>`).join('\n');
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<message>', `<key>${escapeXml(p.key)}</key>`, `<sms>${escapeXml(p.sms)}</sms>`,
    `<templateid>${escapeXml(p.templateId)}</templateid>`, `<sender>${escapeXml(p.senderId)}</sender>`, `<route>${escapeXml(p.route)}</route>`, numbers, '</message>'].join('\n');
}
export function parseSendResponse(body: string): SendResult {
  const text = (body || '').trim();
  if (ERROR_CODES[text]) return { ok: false, code: text, reason: ERROR_CODES[text] };
  if (/^\d+$/.test(text)) return { ok: true, messageId: text };
  return { ok: false, code: 'UNKNOWN', reason: `Unexpected response: ${text.slice(0, 80)}` };
}
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}
export function toIndianMobile(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  let local = digits;
  if (digits.length === 12 && digits.startsWith('91')) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) local = digits.slice(1);
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}
