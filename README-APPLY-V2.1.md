# V2.1 update: full CRUD in the admin dashboard

Apply on top of V2 (PowerShell, from the folder where you unzipped this):

```powershell
$dst = "D:\Talent-platform\Talenthouse"
Copy-Item -Recurse -Force .\backend\src\*          "$dst\backend\src\"
Copy-Item -Force .\backend\prisma\schema.prisma    "$dst\backend\prisma\schema.prisma"
Copy-Item -Recurse -Force .\admin-dashboard\src\*  "$dst\admin-dashboard\src\"
Copy-Item -Recurse -Force .\website\src\*          "$dst\website\src\"
Copy-Item -Recurse -Force .\mobile-app\src\*       "$dst\mobile-app\src\"

cd $dst\backend
npx prisma generate
npx prisma migrate dev --name category-icon      # adds Category.icon
git add prisma/migrations
npm run start:dev
```

Restart the admin dashboard (`npm run dev`). Commit and push so Render redeploys; the pre-deploy step applies the migration.

## What you get
Every sidebar tab is now a full table with search, filters, pagination, **Add, Edit, Delete** and one-click actions:
Users, Categories, Contests, Registrations, Auditions, Reels, Battles, Talents, Bookings, Payments (view only), Finance (queues plus all KYC / withdrawals), Subscriptions, Advertising, Disputes (queue plus all), Commission rules, Config Engine.

- **Categories** are now managed in the database. The mobile app and website read them from `GET /public/categories`, and the admin forms suggest them. The built-in list is copied in the first time the tab is opened.
- One definition file drives both the API and the screens: `backend/src/modules/admin/resources.config.ts`. A new tab is one entry there plus a one-line page.
- Every create, edit and delete is written to the audit log.

## Safety rules built in
- Deleting a user marks the account deleted (history is kept). Other deletes remove the record plus rows that exist only for it. If payments, registrations or bookings still point at it, you get a clear message and should set the status to cancelled or closed instead.
- Only admins can delete. Only a super admin can assign or edit staff roles. You cannot suspend or delete your own account.
- Payments, KYC and withdrawals are view-only here. Approve, pay and refund through their queues so wallets stay correct.
- Approving or rejecting a contest from the edit form still notifies the host.

## Not verified here
All projects typecheck, the admin dashboard builds, and 17 backend tests pass (including 7 for the CRUD engine with a mocked database). I could not run against a real Postgres, so click through each tab once locally.
