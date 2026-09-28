import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end smoke test. Requires a real Postgres instance reachable via
 * DATABASE_URL (e.g. `docker compose up -d postgres && npx prisma migrate deploy`
 * against a disposable test database) — this is NOT run against mocks, unlike
 * the unit specs alongside each service. Run with `npm run test:e2e`.
 *
 * This is intentionally a thin starting scaffold covering the two most
 * publicly-reachable, no-auth-required flows (health of the contests list
 * endpoint, and the OTP request flow's rate limiting) — extend with
 * additional *.e2e-spec.ts files per module as the suite grows.
 */
describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  },120000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/contests returns 200 with an array (public, unauthenticated endpoint)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/contests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/wallet/me without a token returns 401 (protected endpoint correctly rejects anonymous access)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/wallet/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/otp/request rate-limits after 3 requests/minute from the same client', async () => {
    const mobile = '9' + Math.floor(100000000 + Math.random() * 899999999); // fresh number each run to avoid cross-test cooldown collisions
    const attempts = await Promise.all(
      Array.from({ length: 4 }).map(() => request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ mobile })),
    );
    const statuses = attempts.map((r) => r.status);
    // At least one of the 4 rapid requests should be rejected (429 from Throttler, or 400 from the service-level cooldown) —
    // both are correct outcomes of "you can't spam OTP requests", so we accept either.
    expect(statuses.some((s) => s === 429 || s === 400)).toBe(true);
  });
});
