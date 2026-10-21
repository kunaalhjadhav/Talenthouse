# Talent Platform

Entertainment/contest/audition/talent-booking platform: NestJS backend, Next.js admin dashboard, Next.js public website, React Native mobile app.

## Structure
```
backend/            NestJS API — 22 modules, Prisma/Postgres
admin-dashboard/     Next.js admin (port 3001) — includes contest prize/fee editor
website/             Next.js public site (port 3002)
mobile-app/          React Native source only — see mobile-app/README.md
docs/DEPLOYMENT.md   Full setup guide
```

## What's in this build
- ~25 Instagram/YouTube-style content categories, synced across backend seed, mobile app, website
- Audition `designation` (role being cast) + `posterUrl`; LiveSession `thumbnailUrl`
- Contest participation: registration counts, capacity/deadline enforcement, free-contest direct registration, paid-contest Razorpay order creation, a full Contest Detail screen
- Admin prize/fee editor per contest (entry fee, prize pool, winners, commission override)
- Image/video thumbnails everywhere: contests, reels, auditions (poster), talents (avatar), live sessions, chat
- Global font/visibility fix (bold Times New Roman/serif, explicit dark colors) across mobile, admin, website

## Quick start
See `docs/DEPLOYMENT.md`. Run the Prisma migration first — this build adds new columns.
