# Mobile App — Source Only

Contains `src/` and `App.tsx` only — no `android/`/`ios/` native folders,
since hand-copied native scaffolding is what caused the Gradle/IPv6 issues
earlier in this project. The reliable path:

```powershell
npx @react-native-community/cli@latest init TalentApp --version 0.75.2
Copy-Item -Recurse -Force mobile-app\src TalentApp\src
Copy-Item -Force mobile-app\App.tsx TalentApp\App.tsx
cd TalentApp
npm install @react-navigation/native@^6.1.18 @react-navigation/native-stack@^6.11.0 @react-navigation/bottom-tabs@^6.6.1 react-native-screens@^3.34.0 react-native-safe-area-context@^4.10.9 axios @react-native-async-storage/async-storage@1.23.1 react-native-image-picker@^7.1.2 react-native-razorpay
```

Point `src/api/client.ts` at your backend, then apply the OJAS launcher icon and app name:

```powershell
cd D:\Talent-platform\Talenthouse\mobile-app
.\branding\apply-branding.ps1 -AppDir D:\Talent-platform\TalentApp
```

Then build. Uninstall the old app from the emulator first so the new icon shows.

## What's included in this version

- ~25 Instagram/YouTube-style content categories (`src/constants/categories.ts`)
- Audition **designation** field (the specific role being cast) plus a **poster image**
- Contest cards show a video thumbnail, OPEN/CLOSING SOON/FULL/CLOSED status,
  registered/max count, and close date — tap **Participate** for a full
  **Contest Detail** screen with real registration (free contests register
  immediately; paid contests create a Razorpay order — full checkout UI
  needs `react-native-razorpay` added as a follow-up)
- Reels show real video thumbnails; Talents show profile photo avatars;
  Chat shows real avatars
- Bottom nav: Home, Reels, Auditions, Talents, Profile (Host/Judge/Recruiter
  get an extra first tab). Chat is a header icon, not a bottom tab. Wallet
  lives inside Profile's menu.
- Global font/visibility fix: every `Text`/`TextInput` defaults to bold
  Times New Roman/serif with an explicit dark color, set once in `App.tsx`
- Sample content on Home/Auditions/Talents when the API returns nothing,
  clearly labeled as examples
