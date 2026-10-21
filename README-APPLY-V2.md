# V2 update: all preview features, working through the API

Copy these over your existing project (PowerShell, from the folder where you unzipped this):

```powershell
$dst = "D:\Talent-platform\Talenthouse"
Copy-Item -Recurse -Force .\backend\src\*          "$dst\backend\src\"
Copy-Item -Force .\backend\prisma\schema.prisma    "$dst\backend\prisma\schema.prisma"
Copy-Item -Force .\backend\package.json            "$dst\backend\package.json"
Copy-Item -Force .\backend\.env.example            "$dst\backend\.env.example"
Copy-Item -Recurse -Force .\admin-dashboard\src\*  "$dst\admin-dashboard\src\"
Copy-Item -Recurse -Force .\website\src\*          "$dst\website\src\"
Copy-Item -Recurse -Force .\mobile-app\src\*       "$dst\mobile-app\src\"
Copy-Item -Force .\render.yaml                     "$dst\render.yaml"
Copy-Item -Force .\docs\DEPLOYMENT.md              "$dst\docs\DEPLOYMENT.md"
```

Then:

```powershell
cd $dst\backend
npm install
npx prisma generate
npx prisma migrate dev --name feature-pack
npm run start:dev          # add ALLOW_DEV_PAYMENTS=true to .env to test payments without Razorpay keys

cd $dst\mobile-app
npm install react-native-razorpay
```

Rebuild the admin and website (`npm install; npm run dev`). Then follow `docs/DEPLOYMENT.md` section 3 to go live on Render + Neon.

## What changed
- **Config Engine** (admin): commissions, advance %, judge/public weights, vote price, referral bonus, minimum withdrawal, plan prices, tip amounts and XP values are stored in the database and used everywhere.
- **Backend**: bookings with server-side pricing, advance and balance payments with payout, paid vote packs, tips, Premium/Pro plans (lower commission, search priority, no ads), XP/levels/badges/daily check-in, battles, Golden Buzzer, judge feedback, weighted scoring, prize splits, public stats and hall of fame.
- **Admin**: Config Engine, Bookings, Battles, Badges & Levels, extra overview stats.
- **Website**: Hall of Fame, Plans, live stats on the home page.
- **Mobile**: booking and my bookings, talent bookings and calendar, battles, leaderboard, notifications, tips and report on reels, vote packs and judge feedback on contests, weighted judge scoring with Golden Buzzer, Premium/Pro plans, XP and check-in on profile, ads hidden for paid plans.

## Differences from the preview
- Booking is a three-step flow: the talent accepts first, then the customer pays the advance, and the balance is paid after the performance. The preview charged at request time.
- Dev payments (`ALLOW_DEV_PAYMENTS=true`) are local only and are ignored when `NODE_ENV=production`.

## Not verified here
All four projects typecheck and the backend unit tests pass. I could not run the backend against a real database, Razorpay or a device, so test the flows once locally before deploying.
