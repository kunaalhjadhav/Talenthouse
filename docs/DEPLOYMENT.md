# Deployment & Setup Guide

This guide takes the platform from source code to a live, production deployment.
It assumes a single mid-size VPS to start (e.g. a 4 vCPU / 8GB droplet) — the
architecture scales horizontally later by moving Postgres/Redis to managed
services and running multiple backend replicas behind a load balancer.

---

## 0. What's in this repository

```
platform/
├── backend/            NestJS API (auth, contests, talents, bookings, payments, admin)
├── admin-dashboard/     Next.js admin web app
├── mobile-app/          React Native source (iOS + Android, one codebase)
├── docker-compose.yml   Local/staging orchestration (Postgres, Redis, backend, admin)
└── docs/DEPLOYMENT.md   This file
```

The **public user-facing website** is not included as a separate app here — the
fastest path is to reuse the same Next.js app pattern as the admin dashboard
(a second Next.js project consuming the same API) when you're ready to build it;
the backend already exposes everything it needs (`/contests`, `/talents`, etc.
are public GET routes).

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| A domain name | e.g. `yourdomain.com`, with DNS you control |
| A VPS or cloud account | AWS / DigitalOcean / GCP — Ubuntu 22.04 recommended |
| Docker + Docker Compose | `curl -fsSL https://get.docker.com | sh` |
| Razorpay account (Live mode) | Business KYC must be approved before going live |
| Google Cloud account | For Maps Platform API key |
| Firebase project | For push notifications (FCM) |
| SMS provider account | e.g. MSG91, Twilio, or an Indian DLT-registered provider (mandatory for transactional SMS in India) |
| S3-compatible storage | AWS S3, Cloudflare R2, or DigitalOcean Spaces |
| Apple Developer account ($99/yr) | Required to publish the iOS app |
| Google Play Console account ($25 one-time) | Required to publish the Android app |

---

## 2. Server setup

```bash
# On the server
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y nginx certbot python3-certbot-nginx git

git clone <your-private-repo-url> platform
cd platform
```

---

## 3. Database & backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in every value. Key ones:

- `DATABASE_URL` — leave as-is if using the bundled `docker-compose.yml` Postgres
  service, matching `POSTGRES_PASSWORD` you set in step 4.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with:
  ```bash
  openssl rand -base64 48
  ```
  Use two **different** long random values. Never reuse across environments.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay Dashboard → Settings → API Keys (generate **Live** keys once KYC is approved; use **Test** keys for staging).
- `RAZORPAY_WEBHOOK_SECRET` — see section 6 below.
- `GOOGLE_MAPS_API_KEY` — Google Cloud Console → APIs & Services → Credentials. Restrict the key to Maps JavaScript API, Places API, and Geocoding API, and set an HTTP referrer/IP restriction.
- `FIREBASE_*` — Firebase Console → Project Settings → Service Accounts → Generate new private key. Paste the JSON's `project_id`, `client_email`, and `private_key` (keep the `\n` escapes intact).
- `S3_*` — from your storage provider's dashboard.

At the repo root:

```bash
cp .env.example .env   # if you add one for docker-compose-level vars (POSTGRES_PASSWORD)
```

Set `POSTGRES_PASSWORD` in a root `.env` file so `docker-compose.yml` can read it.

---

## 4. First boot & database migration

```bash
docker compose up -d postgres redis
docker compose build backend admin-dashboard
docker compose up -d backend admin-dashboard
```

The backend container automatically runs `prisma migrate deploy` on boot (see
the `command:` override in `docker-compose.yml`). For the very first deploy,
generate the initial migration from your local machine (with a local Postgres
or against staging) before deploying to production:

```bash
cd backend
npx prisma migrate dev --name init
```

Commit the generated `prisma/migrations/` folder — `migrate deploy` in
production only *applies* migrations, it never generates them.

Seed reference data (default commission rules, categories, a super-admin login):

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

The seed creates a super admin with mobile `9999999999`. **Change this
immediately**: log into the admin dashboard, go to Users, and either update
this record's mobile number to a real one you control, or create a new
SUPER_ADMIN user via direct DB access and suspend the seeded one.

---

## 5. Reverse proxy & HTTPS

Example Nginx config (`/etc/nginx/sites-available/platform`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

Point your DNS `A` records for `api` and `admin` subdomains at the server's IP
before running certbot.

---

## 6. Configuring Razorpay (payments)

1. **Test mode first.** Build and QA the entire registration/booking/payment
   flow with Razorpay Test keys before ever touching Live keys.
2. **Webhook setup** (Razorpay Dashboard → Settings → Webhooks → Add New Webhook):
   - URL: `https://api.yourdomain.com/api/v1/payments/webhook`
   - Active events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`
   - Copy the **Webhook Secret** shown after creation into `RAZORPAY_WEBHOOK_SECRET`
     in `backend/.env` and restart the backend container.
   - The backend verifies every webhook's HMAC signature before trusting it
     (`razorpay.service.ts` → `verifyWebhookSignature`). **Never** mark a
     payment successful based on a frontend callback alone — the frontend
     Razorpay checkout success handler should just poll
     `GET /payments/:id` (add this read endpoint) rather than write anything.
3. **Payouts to hosts/judges/talents.** The commission engine calculates net
   payout amounts and credits them to each user's in-app wallet (`WalletService`)
   automatically. Getting money *out* of the platform and into a person's bank
   account requires either:
   - **RazorpayX Payouts** (recommended) — a separate product requiring its
     own approval; once enabled, implement `RazorpayService.createPayout()`
     (currently a stub) using fund accounts tied to each user's KYC bank details.
   - **Manual batch payouts** — export the `payments` and `wallet` tables via
     the Admin Dashboard, run a manual bank transfer batch, then mark
     withdrawals as processed in the admin panel. Acceptable for MVP/early
     volume; automate once payout volume justifies RazorpayX integration.
4. **Reconciliation.** Run a daily job (e.g. via `@nestjs/schedule`, already
   installed) that cross-checks Razorpay's Payments API against your local
   `Payment` table and flags mismatches for finance review.

---

## 7. SMS (OTP) provider

The `OtpService` (`backend/src/modules/auth/otp.service.ts`) has a clearly
marked `TODO` where you plug in your SMS provider's send-SMS API call. Steps:

1. Register a DLT entity + sender ID (mandatory for transactional SMS to Indian
   numbers) via your SMS provider (MSG91, Kaleyra, etc.) — this can take
   several days, start early.
2. Add the provider's send call inside `OtpService.requestOtp()`, using
   `process.env.SMS_PROVIDER_API_KEY`.
3. Remove the `console.log`/`logger.debug` OTP line before going to
   production — it's guarded by `NODE_ENV !== 'production'` already, but
   double-check your production `.env` sets `NODE_ENV=production`.

---

## 8. Object storage & video pipeline

1. Create an S3 bucket (or R2/Spaces equivalent) with public-read on a
   `/public` prefix for served media, and private ACLs elsewhere.
2. Put a CDN in front of it (CloudFront, Cloudflare, or your storage
   provider's built-in CDN) and set `CDN_BASE_URL`.
3. Video transcoding (360p/480p/720p/1080p, per PRD §71) is **not** included
   in this codebase — it needs a dedicated pipeline. Two practical options:
   - **AWS MediaConvert** (or Elastic Transcoder) triggered by an S3 upload
     event → Lambda → MediaConvert job → writes renditions back to S3.
   - **Cloudflare Stream** or **Mux** — much less infra to manage, both have
     simple upload APIs and give you adaptive streaming out of the box; a good
     default choice for an MVP.
   Wire the chosen provider's upload endpoint into the Reels upload flow
   (mobile app → gets a signed upload URL from a new backend endpoint you add
   in `reels` module → uploads directly to the provider).

---

## 9. Firebase (push notifications)

1. Create a Firebase project, add Android + iOS apps to it.
2. Download `google-services.json` (Android) and `GoogleService-Info.plist`
   (iOS) and place them in `mobile-app/android/app/` and `mobile-app/ios/`
   respectively (create those native folders by running
   `npx react-native init` once locally to scaffold native projects — see
   section 11).
3. Backend: generate a service account key (Firebase Console → Project
   Settings → Service Accounts) and set the three `FIREBASE_*` env vars.
4. Wire `firebase-admin` (already in `package.json`) into a
   `NotificationsService` that sends to each user's stored FCM device token
   (add a `fcmToken` field on `User` or a separate `DeviceToken` model) — the
   schema is intentionally left extensible here since token management is
   fairly app-specific.

---

## 10. Admin dashboard deploy

```bash
cp admin-dashboard/.env.local.example admin-dashboard/.env.local
# set NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
docker compose build admin-dashboard
docker compose up -d admin-dashboard
```

Visit `https://admin.yourdomain.com`, sign in with the super-admin mobile
number from the seed step, and immediately:

1. Go to **Commission Settings** and confirm/adjust the default 25%
   contest / 15% booking / 20% voting rates.
2. Review **Contests → Pending** and **Talents → Pending** queues (empty
   until real users sign up).

---

## 11. Mobile app: from source to app stores

The `mobile-app/` folder contains real, working source: JS/TS app code (`src/`,
`App.tsx`) **and** a hand-authored Android native project (`android/`) that is
directly buildable. iOS's native project (`ios/*.xcodeproj`) uses Xcode's
`project.pbxproj` format, which is not safe to hand-write from scratch — one
misplaced reference silently corrupts the whole project — so for iOS we
generated the real source files (`AppDelegate.mm`, `Info.plist`, `Podfile`,
Privacy Manifest) and give you an exact, low-risk way to get the `.xcodeproj`
shell itself.

### Android (buildable as-is)

```bash
cd mobile-app
npm install
cd android
# One-time: generate the Gradle wrapper jar (not included — see gradle/wrapper/README.txt)
gradle wrapper --gradle-version 8.7
# One-time: generate a debug keystore (see app/debug.keystore.README.txt)
keytool -genkeypair -v -storetype PKCS12 -keystore app/debug.keystore \
  -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
```

Then either open `android/` directly in Android Studio (it will sync and run
immediately), or from the command line:

```bash
./gradlew assembleDebug     # installable debug APK
```

Before your first run:
1. **Launcher icons** — each `res/mipmap-*/README.txt` explains how to
   generate real `ic_launcher.png`/`ic_launcher_round.png` via Android
   Studio's Image Asset tool (Image Asset tool needs real artwork, which
   can't be meaningfully generated as code).
2. **Google Maps key** — add `GOOGLE_MAPS_API_KEY=your_key` to
   `android/gradle.properties`; it's already wired into `AndroidManifest.xml`
   via `${GOOGLE_MAPS_API_KEY}`.
3. **Firebase** — drop `google-services.json` into `android/app/` (from
   Firebase Console, see section 9) and add the Google Services Gradle plugin
   (`com.google.gms.google-services`) to `android/build.gradle` +
   `android/app/build.gradle` per Firebase's standard RN setup docs.
4. **Release signing** — generate a **separate** release keystore (never reuse
   the debug one), then set `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`,
   `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD` in `android/gradle.properties`
   (already wired into `app/build.gradle`'s `signingConfigs.release`). Build
   with `./gradlew bundleRelease` to produce the `.aab` for Play Console.

### iOS

Xcode project files can't be safely hand-authored, so generate the project
shell with CocoaPods' own tooling rather than the full `react-native init`
(which would also overwrite the JS source we've already built):

```bash
cd mobile-app
npm install
npx react-native@0.75.2 init TempShell --skip-install --directory /tmp/rn-ios-shell
# Copy ONLY the generated ios/ folder's *.xcodeproj and *.xcworkspace scaffolding
# into this project, then overwrite these four files with the real ones we
# already wrote (don't let the template versions win):
cp -f /tmp/rn-ios-shell/ios/TempShell.xcodeproj -r mobile-app/ios/TalentPlatformMobile.xcodeproj
# (rename references inside the .xcodeproj from TempShell -> TalentPlatformMobile
#  via Xcode's own rename refactor after opening it — this keeps internal
#  UUIDs/references consistent, which manual text editing would risk breaking)
cd mobile-app/ios
pod install
```

Then in Xcode:
1. Open `TalentPlatformMobile.xcworkspace` (not the `.xcodeproj` — CocoaPods
   requires the workspace).
2. Product → Rename to `TalentPlatformMobile` if it isn't already, confirming
   the rename propagates to the scheme and target.
3. Signing & Capabilities tab → set your Team and Bundle Identifier
   (e.g. `com.yourcompany.talentplatform`).
4. Confirm `AppDelegate.mm`, `AppDelegate.h`, `Info.plist`, `main.m`, and
   `PrivacyInfo.xcprivacy` in the project are the ones from this repo (drag
   them in from Finder if Xcode's template versions were used instead).
5. Add `GOOGLE_MAPS_API_KEY` as a build setting or scheme environment variable
   — it's referenced via `$(GOOGLE_MAPS_API_KEY)` in `Info.plist`.
6. Drop in `GoogleService-Info.plist` from Firebase Console (section 9).
7. Product → Archive → Distribute App, once you're ready to upload to App
   Store Connect.

### Both platforms

- Update `mobile-app/src/api/client.ts`'s `API_URL` to your production API
  domain before building release binaries.
- Both stores require privacy policy URLs, data-safety disclosures, and (for
  contest/voting apps with payments) may ask clarifying questions about
  real-money elements — have your Terms, Privacy Policy, and Refund Policy
  (PRD §77) live on the public website before submitting for review.

---

## 12. CI/CD (recommended baseline)

A minimal GitHub Actions pipeline per service:

```yaml
# .github/workflows/backend-deploy.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd platform && git pull
            docker compose build backend
            docker compose up -d backend
```

Duplicate for `admin-dashboard` with its own `paths:` filter. For mobile,
use Fastlane + GitHub Actions (or Expo EAS Build if you migrate to Expo)
once you're shipping frequent releases — manual builds are fine for the
first several releases.

---

## 13. Monitoring & backups

- **Error tracking**: add Sentry (`@sentry/node` backend, `@sentry/nextjs`
  admin, `@sentry/react-native` mobile) — not included by default, add when
  ready.
- **Uptime**: a simple external monitor (UptimeRobot, Better Uptime) hitting
  `GET /api/v1/contests` every few minutes is a good start.
- **Database backups**: 
  ```bash
  # Daily cron on the server
  docker compose exec -T postgres pg_dump -U platform_user platform_db | gzip > backup_$(date +%F).sql.gz
  ```
  Ship these off-server (S3) — a backup that lives only on the same disk as
  the database doesn't protect you from disk failure.
- **Logs**: `docker compose logs -f backend` for now; graduate to a log
  aggregator (Loki, CloudWatch) once traffic justifies it.

---

## 14. Pre-launch checklist

- [ ] Razorpay Live keys active, webhook verified end-to-end with a real ₹1 test transaction
- [ ] SMS OTP delivering to real numbers (DLT registration complete)
- [ ] Terms, Privacy Policy, Refund Policy, and contest-specific rules published and linked in-app
- [ ] Super admin seeded account's mobile number changed from the default
- [ ] Commission rules reviewed and confirmed for launch (default: 25% contest / 15% booking / 20% voting)
- [ ] SSL certificates valid on all subdomains
- [ ] Database backups running and verified restorable
- [ ] Android `.aab` and iOS build both submitted and approved by their respective stores
- [ ] Legal documents reviewed by a qualified Indian legal/tax professional (PRD §77 — this codebase does not include legal drafting)

---

## 15. What's deliberately left as an extension point

To keep this initial build honest and correct rather than sprawling and
untested, a few PRD sections are scaffolded architecturally but not fully
implemented in code yet. Each is a natural "next module" to add using the same
patterns already established (Prisma model → service → controller → admin UI
page → mobile screen):

- **Reels feed ranking algorithm** (PRD §3.3) — the `Reel` model and basic
  CRUD exist; the "For You" recommendation scoring is not implemented.
- **Auditions module UI** — backend `Audition`/`AuditionApplication` models
  exist in the schema; controller/service/admin pages follow the same
  pattern as `contests`.
- **Live streaming** (PRD §41) — intentionally out of scope for MVP per the
  PRD itself; the schema has no live-session tables yet since the vendor
  choice (Agora, 100ms, etc.) should drive that design.
- **Referral system, subscriptions, advertising** (PRD §58–59, §43) — Phase 2
  per the PRD's own phasing; build after the core loop (contest → payment →
  settlement → payout) is proven with real users.
