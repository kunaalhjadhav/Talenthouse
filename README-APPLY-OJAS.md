# OJAS branding update: logo and launcher icon everywhere

Run from the folder where you unzipped this (PowerShell):

```powershell
$dst = "D:\Talent-platform\Talenthouse"
Copy-Item -Recurse -Force .\admin-dashboard\*  "$dst\admin-dashboard\"
Copy-Item -Recurse -Force .\website\*          "$dst\website\"
Copy-Item -Recurse -Force .\mobile-app\*       "$dst\mobile-app\"
Copy-Item -Recurse -Force .\backend\*          "$dst\backend\"
```

Mobile launcher icon and app name (Android and iOS):

```powershell
cd $dst\mobile-app
.\branding\apply-branding.ps1 -AppDir D:\Talent-platform\TalentApp
Copy-Item -Recurse -Force .\src D:\Talent-platform\TalentApp\src
```
Uninstall the old app from the emulator or phone, then run `npx react-native run-android`. Android caches icons, so the old icon stays until you uninstall.

Restart the admin dashboard and website (`npm run dev`). Hard refresh the browser (Ctrl+Shift+R) to see the new tab icon.

## Where the logo is now
- Admin: browser tab icon, sidebar, login page.
- Website: browser tab icon, header, footer, home page hero, link preview image.
- Mobile: launcher icon (square and round), app name "OJAS", login screen, header of every main screen, payment sheet name.
- `mobile-app/branding/playstore-icon-512.png` is ready for the Play Store listing.

## Not changed on purpose
- The OTP SMS text still says "Talent Platform". SMSLocal DLT templates must match the approved text exactly. Change it only after you get a new template approved.
- This zip also includes the `main.ts` login fix from earlier.
