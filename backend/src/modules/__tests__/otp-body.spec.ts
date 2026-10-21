import { Controller, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
const http = require('http');
@Controller('hook') class HookCtl { @Post() h(@Req() req: any) { return { raw: req.rawBody?.toString(), body: req.body }; } }

function post(port: number, body: string, headers: Record<string, string>) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = http.request({ port, path: '/api/v1/auth/otp/request', method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) } }, (res: any) => { let t = ''; res.on('data', (c: any) => (t += c)); res.on('end', () => resolve({ status: res.statusCode, text: t })); });
    req.on('error', reject); req.write(body); req.end();
  });
}
describe('OTP request body parsing (mirrors main.ts)', () => {
  let app: NestExpressApplication; let port: number; const calls: string[] = [];
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])], controllers: [AuthController, HookCtl], providers: [{ provide: AuthService, useValue: { requestOtp: async (m: string) => { calls.push(m); return { ok: true }; } } }] }).compile();
    app = mod.createNestApplication<NestExpressApplication>({ cors: true, rawBody: true } as any);
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0); port = (app.getHttpServer().address() as any).port;
  });
  afterAll(async () => { await app.close(); });
  it('accepts a JSON body with mobile', async () => {
    const r = await post(port, JSON.stringify({ mobile: '9999999999' }), { 'Content-Type': 'application/json' });
    expect(r.status).toBeLessThan(300); expect(calls).toContain('9999999999');
  });
  it('keeps the raw body for webhook signature checks', async () => {
    const payload = JSON.stringify({ event: 'payment.captured' });
    const r: any = await new Promise((resolve, reject) => { const q = http.request({ port, path: '/api/v1/hook', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res: any) => { let s = ''; res.on('data', (c: any) => (s += c)); res.on('end', () => resolve(JSON.parse(s))); }); q.on('error', reject); q.write(payload); q.end(); });
    expect(r.raw).toBe(payload); expect(r.body.event).toBe('payment.captured');
  });
  it('shows the reported error when the body arrives empty or with another content type', async () => {
    const r = await post(port, 'mobile=9999999999', { 'Content-Type': 'text/plain' });
    expect(r.status).toBe(400); expect(r.text).toMatch(/mobile must be a string/);
  });
});
