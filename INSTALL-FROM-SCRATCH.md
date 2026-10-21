# Install the whole Talent Platform from scratch (Windows, PowerShell)

Project folder after unzipping: `D:\Talent-platform\Talenthouse` (change the paths if you use another folder).

## 0. Install once
- Node.js 20 LTS (nodejs.org), Git, Docker Desktop, Android Studio (for the mobile app)
- Check: `node -v`, `git --version`, `docker --version`

## 1. Database (Docker Postgres on port 5433)
```powershell
docker run --name talent-db -e POSTGRES_USER=platform_user -e POSTGRES_PASSWORD=platform_pass -e POSTGRES_DB=platform_db -p 5433:5432 -d postgres:16
```
Next time: `docker start talent-db`

## 2. Backend (API on http://localhost:4000)
```powershell
cd D:\Talent-platform\Talenthouse\backend
Copy-Item .env.example .env
```
Edit `.env`:
```
DATABASE_URL=postgresql://platform_user:platform_pass@localhost:5433/platform_db?schema=public
JWT_ACCESS_SECRET=<random string>
JWT_REFRESH_SECRET=<a different random string>
ALLOW_DEV_PAYMENTS=true
```
Random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
```powershell
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```
Check http://localhost:4000/api/docs. Keep this window open.

## 3. Admin dashboard (http://localhost:3000)
New PowerShell window:
```powershell
cd D:\Talent-platform\Talenthouse\admin-dashboard
Copy-Item .env.local.example .env.local
npm install
npm run dev
```
Log in with mobile `9999999999`. The OTP prints in the backend window.

## 4. Website (http://localhost:3002)
```powershell
cd D:\Talent-platform\Talenthouse\website
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

## 5. Mobile app
Native Android/iOS folders are not shipped. Generate them, then copy the source in:
```powershell
cd D:\Talent-platform
npx @react-native-community/cli@latest init TalentApp --version 0.75.2
Copy-Item -Recurse -Force .\Talenthouse\mobile-app\src .\TalentApp\src
Copy-Item -Force .\Talenthouse\mobile-app\App.tsx .\TalentApp\App.tsx
cd TalentApp
npm install @react-navigation/native@^6.1.18 @react-navigation/native-stack@^6.11.0 @react-navigation/bottom-tabs@^6.6.1 react-native-screens@^3.34.0 react-native-safe-area-context@^4.10.9 axios @react-native-async-storage/async-storage@1.23.1 react-native-image-picker@^7.1.2 react-native-razorpay
```
- `src\api\client.ts`: the default `http://10.0.2.2:4000/api/v1` works for the Android emulator. For a real phone use `http://<your PC LAN IP>:4000/api/v1`.
- Android permissions: in `android\app\src\main\AndroidManifest.xml` allow cleartext HTTP for local testing (`android:usesCleartextTraffic="true"` on the `<application>` tag).
- Start an emulator in Android Studio, then:
```powershell
npx react-native start
npx react-native run-android      # second window
```
If Gradle downloads fail on an IPv6-only network, switch to an IPv4 network or hotspot for the first build.

## 6. Quick test of the whole system
1. Admin: Categories tab (lists fill in automatically), Config Engine (review rates).
2. App: log in with any mobile number; the OTP prints in the backend window.
3. Add a contest from the admin Contests tab and approve it; it shows in the app and on the website.
4. Pay an entry fee: with `ALLOW_DEV_PAYMENTS=true` no Razorpay keys are needed.

## 7. Deploy to the server
Follow `docs\DEPLOYMENT.md` (Render + Neon). In short: push to GitHub, create the Neon database, run `npx prisma migrate deploy` and the seed against it, create a Render Blueprint from `render.yaml`, set `DATABASE_URL`, the Razorpay keys and `NEXT_PUBLIC_API_URL`, and add the Razorpay webhook.
