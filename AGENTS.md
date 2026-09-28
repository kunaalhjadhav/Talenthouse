# Talenthouse agent guide

Monorepo for the contest, audition, and talent marketplace.

| Path | What it is |
|---|---|
| `backend/` | NestJS API, Prisma, PostgreSQL |
| `admin-dashboard/` | Next.js operator UI |
| `website/` | Next.js public site |
| `flutter-app/` | Production mobile client (added in a later phase) |
| `mobile-app/` | Legacy React Native reference. Do not add features here |
| `docs/` | Deployment and setup |

## Backend

- One domain module per folder: controller, service, DTO, and a Nest module.
- Money movement goes through `WalletService` and `PaymentsService` only.
- Commission percentages go through `CommissionService` only.
- Payment status changes only inside the signature-verified Razorpay webhook.
- Every write endpoint takes a class-validator DTO. Do not pass `@Body() body: any` into Prisma.
- Authenticated role and account status come from the database on each request, not from stale token claims.
- Required environment variables are validated at boot in `backend/src/config/env.validation.ts`. Secrets stay in untracked env files. `.env.example` lists placeholders only.

## Clients

- Admin and website call the API with `NEXT_PUBLIC_API_URL`.
- Flutter (when added) reads `API_URL` from `--dart-define` only. No hardcoded production host.
- One HTTP client and one auth token store per app.

## Tests and docs

- Changes to auth, payments, wallet, or contest settlement need unit tests in the same change.
- If a setup step changes, update `docs/DEPLOYMENT.md` in the same change.
