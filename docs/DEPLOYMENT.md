# Deployment Guide

## 1. Local setup
```powershell
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev

cd admin-dashboard
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3000

cd website
cp .env.local.example .env.local
npm install
npm run dev   # http://localhost:3002
```
Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Default seeded super-admin: mobile `9999999999`. With `NODE_ENV=development`, OTPs print in the backend terminal instead of being sent.

## 2. Database — Neon
Create a project, copy the direct (non-pooled) connection string, then:
```powershell
$env:DATABASE_URL = "your-neon-string"
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

## 3. Production deploy (Render + Neon)

The repo root has a `render.yaml` Blueprint. Two ways to use it.

**A. Blueprint (fastest).** Push the project to GitHub, then in Render: New, Blueprint, pick the repo. Render creates `talent-api`, `talent-admin` and `talent-website`. It asks for the values marked `sync: false`. Enter your Neon `DATABASE_URL` and the Razorpay keys (test keys are fine to start).

**B. By hand.** Create three Web Services from the same repo, Node runtime (not Docker):

| Service | Root directory | Build command | Pre-deploy command | Start command |
|---|---|---|---|---|
| API | `backend` | `npm install --include=dev && npx prisma generate && npm run build` | `npx prisma migrate deploy` | `node dist/main` |
| Admin | `admin-dashboard` | `npm install --include=dev && npm run build` | none | `npm start` |
| Website | `website` | `npm install --include=dev && npm run build` | none | `npm start` |

Put the build command in the **Build Command** field. On the Deploy settings page the "Docker Command" field is for Docker services only and is ignored for Node.

### Environment variables
API: `NODE_ENV=production`, `DATABASE_URL` (Neon), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Optional until you have accounts: `MUX_*`, `SMSLOCAL_*`, `FIREBASE_*`.
Do not set `ALLOW_DEV_PAYMENTS` in production. It is switched off there anyway.
Admin and website: `NEXT_PUBLIC_API_URL=https://<your-api>.onrender.com/api/v1`. This is baked in at build time, so redeploy after changing it.

### Razorpay webhook
Razorpay dashboard, Settings, Webhooks, add `https://<your-api>.onrender.com/api/v1/payments/webhook`, event `payment.captured`, and use the same secret as `RAZORPAY_WEBHOOK_SECRET`. Payments are confirmed only by this webhook in production.

### Database migrations
This update changes the schema (settings, badges, tips, battles, buzzers, booking fields). Create the migration once on your machine, commit it, and Render applies it on every deploy:
```powershell
cd backend
$env:DATABASE_URL = "postgresql://platform_user:...@localhost:5433/platform_db?schema=public"
npx prisma migrate dev --name feature-pack
git add prisma/migrations
git commit -m "Add feature-pack migration"
git push
```
The first deploy against an empty Neon database runs `prisma migrate deploy`, then seed once from your machine:
```powershell
$env:DATABASE_URL = "<neon direct connection string>"
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

### After deploy
1. Open `https://<api>/api/docs`; it should load.
2. Sign in to the admin dashboard with the seeded super-admin (mobile `9999999999`). Without SMS configured, OTPs appear in the API logs on Render only if `NODE_ENV` is not production, so keep SMSLocal set up before launch or sign in once locally.
3. Open Config Engine and review the commissions, vote price and plan prices.
4. Free Render services sleep when idle (first request takes about 30 seconds) and uploaded images are wiped on redeploy. Use a paid instance and S3/Cloudinary storage for real launch.

## 4. SMS: SMSLocal
Fill in `SMSLOCAL_*` once your DLT sender ID and template are approved. Until then `NODE_ENV=development` prints OTPs to the console.

## 5. Mobile app
See `mobile-app/README.md`. Copy `src/` and `App.tsx` over your React Native project, run `npm install`, and set `API_URL` in `src/api/client.ts` to your Render API URL for release builds. `react-native-razorpay` autolinks, so no manual linking is needed.
