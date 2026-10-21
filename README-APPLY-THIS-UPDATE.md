# Completion Update — apply over your existing Talenthouse/TalentApp project

This adds everything that was previously a stub or missing entirely:
public voting, premium subscription purchase, ads actually displaying in the
app, followers/following lists, host judge-assignment, real photo upload
(replacing the paste-a-URL fields), and real Razorpay checkout (replacing
the "order created, no checkout UI" placeholder).

## What's genuinely still outside this update (needs YOUR accounts, not more code)
- **Live video streaming** — needs an Agora (or similar) account; `live.service.ts`'s
  `generateJoinToken` still throws a clear "not configured" error until you add
  `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` and implement token generation for that SDK.
- **Real SMS** — needs your SMSLocal DLT sender ID approved (this was already wired,
  just needs your approved credentials in `.env`).
- **Push notifications** — needs your real Firebase project credentials in `.env`
  (also already wired).
- **Image storage persistence** — the new upload endpoint stores files on local disk.
  Fine for local dev or a VPS with a persistent disk. On Render's free tier, uploaded
  images are wiped on every redeploy — swap `uploads.controller.ts`'s disk storage for
  S3/Cloudinary before relying on this in that specific hosting setup.

## 1. Backend — copy these files over your existing backend/src/
```
backend/src/app.module.ts                          → overwrite
backend/src/main.ts                                 → overwrite
backend/src/modules/judges/judges.service.ts        → overwrite
backend/src/modules/judges/judges.controller.ts     → overwrite
backend/src/modules/judges/judges.module.ts         → overwrite
backend/src/modules/uploads/                        → new folder, copy in full
```

Add the new dependency (see `backend/package.json.PATCH-NOTES.txt` for exact lines):
```powershell
cd backend
npm install multer@^1.4.5-lts.1
npm install --save-dev @types/multer@^1.4.11
```

Create the uploads folder the new endpoint writes to:
```powershell
mkdir uploads
echo uploads/ >> .gitignore
```

No new Prisma migration is needed — nothing in this update changes the database schema.

Restart:
```powershell
npm run start:dev
```

## 2. Admin dashboard
```
admin-dashboard/src/app/dashboard/ads/page.tsx      → overwrite
```

## 3. Mobile app — copy into your TalentApp project's src/
```
mobile-app/src/components/AdBanner.tsx                          → new
mobile-app/src/components/ImageUploadField.tsx                  → new
mobile-app/src/navigation/RootNavigator.tsx                      → overwrite
mobile-app/src/screens/ContestDetailScreen.tsx                   → overwrite
mobile-app/src/screens/FollowListScreen.tsx                      → new
mobile-app/src/screens/HomeScreen.tsx                            → overwrite
mobile-app/src/screens/ProfileScreen.tsx                         → overwrite
mobile-app/src/screens/SubscriptionScreen.tsx                    → new
mobile-app/src/screens/UserProfileScreen.tsx                     → overwrite
mobile-app/src/screens/host/AssignJudgeScreen.tsx                → new
mobile-app/src/screens/host/CreateContestScreen.tsx              → overwrite
mobile-app/src/screens/host/HostContestDetailScreen.tsx          → overwrite
mobile-app/src/screens/recruiter/CreateAuditionScreen.tsx        → overwrite
```

Then follow `mobile-app/package.json.PATCH-NOTES.txt` exactly — it installs
`react-native-razorpay` and walks through its Android native linking, which
cannot be done by just copying files (it needs two Gradle file edits and one
Java/Kotlin import).

Rebuild:
```powershell
cd android && .\gradlew clean
cd ..
npx react-native run-android
```

## 4. Quick test checklist once it's running
- [ ] Create a contest as Host with a real photo (not a pasted URL) — banner should appear
- [ ] Register for a paid contest as Participant — the real Razorpay sheet should open (use test card `4111 1111 1111 1111`, any future expiry, any CVV, with test keys)
- [ ] Go to Profile → Go Premium — same real Razorpay sheet for the ₹199 upgrade
- [ ] Open a contest with public voting enabled — a "Vote for your favorite" section with working vote buttons should appear
- [ ] On someone's profile, tap "Followers" or "Following" — a list should open
- [ ] As Host, open a contest → "Assign Judge" — verified judges should list, with assign working
- [ ] Create an ad in Admin (with an Image URL) targeting `HOME_BANNER` and activate it — it should appear at the top of the mobile Home screen
