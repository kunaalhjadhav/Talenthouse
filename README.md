# Entertainment, Contest, Audition & Talent Marketplace

Production-oriented starting codebase for the platform described in the PRD:
short-video reels, contests with judging + public voting, auditions, a talent
booking marketplace, an admin dashboard, and a configurable commission engine
— with Razorpay payments wired through webhook-verified state changes.

## What's implemented

| Area | Status |
|---|---|
| OTP auth (mobile + JWT access/refresh) | ✅ working |
| Users, roles, KYC model | ✅ working |
| Wallet + transaction ledger | ✅ working |
| Commission engine (contest/booking/voting, fully admin-configurable) | ✅ working |
| Contests (create → admin approval → registration → judge scoring → public voting → settlement/payout) | ✅ working |
| Talent profiles, search, calendar | ✅ working |
| Bookings (advance/balance split, commission, calendar hold) | ✅ working |
| Razorpay orders + webhook-verified payment confirmation | ✅ working |
| Admin dashboard (Next.js): overview stats, contest/audition/reel approval queues, user management, talent verification, payments log, commission settings | ✅ working |
| Mobile app (React Native): OTP login, contests feed, reels feed, auditions browse+apply, talent browse, wallet, profile | ✅ JS source working. **Android**: real, buildable native project included. **iOS**: real source files included (AppDelegate, Info.plist, Podfile, Privacy Manifest) — `.xcodeproj` shell must be generated locally (Xcode project files can't be safely hand-written; see DEPLOYMENT.md §11) |
| Auditions (post → admin approval → apply → shortlist/select by recruiter) | ✅ working |
| Reels (upload, feed ranking — For You / Trending / Category / Following, like/view counters, report → moderation queue) | ✅ working |
| Follow / social graph (follow, unfollow, followers/following lists, counts, public profiles) | ✅ working |
| Chat/messaging (conversations, polling-based; upgrade path to WebSockets documented) | ✅ working |
| Push notifications (real FCM sending via firebase-admin, device token management) | ✅ working |
| KYC + withdrawals (submit/review, reserve-on-request, refund-on-failure) | ✅ working |
| Host / Judge / Recruiter portals (mobile) | ✅ working |
| Ratings/reviews, disputes (with wallet-integrated resolution), referrals (with fraud-resistant payout), subscriptions, advertising | ✅ working |
| Live streaming | 🧩 Session management (schedule/start/end/viewer count/paid-session gating) fully works; actual video transport needs a vendor SDK (Agora/100ms/Twilio) with real credentials — see `live.service.ts` and DEPLOYMENT.md |
| Video transcoding (reels) | ✅ Real Mux integration — direct upload, webhook-driven processing, playback URLs |
| Public marketing website | ✅ working (Next.js: home, contests, talents, auditions, legal pages) |
| Automated tests | ✅ Unit tests for commission engine, wallet (withdrawal reservation/refund), OTP auth, contest settlement, referral payouts. E2E smoke-test scaffold. Run `npm test` / `npm run test:e2e` in `backend/` |

See `docs/DEPLOYMENT.md` for the full production setup guide, including
Razorpay webhook configuration, SMS/Firebase/Maps setup, and how to turn the
mobile source into real App Store/Play Store builds.

## Local development

```bash
# 1. Start Postgres + Redis
docker compose up -d postgres redis

# 2. Backend
cd backend
cp .env.example .env          # then edit DATABASE_URL, JWT secrets, Razorpay TEST keys
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev             # http://localhost:4000/api/docs for Swagger

# 3. Admin dashboard (separate terminal)
cd admin-dashboard
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000

# 4. Mobile app — see docs/DEPLOYMENT.md section 11 to generate the native project
```

Default seeded super-admin mobile number: `9999999999` (change immediately —
see DEPLOYMENT.md §4).

## Architecture

- **Backend**: NestJS + Prisma + PostgreSQL, modular by domain
  (`auth`, `wallet`, `commission`, `contests`, `talents`, `bookings`,
  `voting`, `payments`, `admin`). Every commission percentage is resolved
  through `CommissionService` — nothing is hard-coded in business logic.
- **Payments**: Razorpay orders created server-side; payment state changes
  only ever happen from a signature-verified webhook, never a frontend
  callback — see `payments.controller.ts` and `razorpay.service.ts`.
- **Admin dashboard**: Next.js (App Router) + Tailwind, talks to the same
  API as the mobile app, gated by JWT role checks.
- **Mobile**: React Native, shares the same backend contract. Token refresh
  is handled transparently in the Axios interceptor.

Full entity-relationship model is in `backend/prisma/schema.prisma` — it maps
directly onto the PRD's §52 "Database Core Tables" section, extended with
several supporting tables (scoring criteria, calendar slots, wallet
transactions, commission rules, audit log) needed to make those flows actually
work end-to-end rather than just exist as headline tables.
