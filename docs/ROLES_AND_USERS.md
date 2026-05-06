# রোল · লগইন ইমেইল · পাসওয়ার্ড

লোকাল ডেমো ইউজারগুলো `apps/server` থেকে `npm run db:seed` চালালে তৈরি/আপডেট হয়।

| রোল | ইমেইল | পাসওয়ার্ড |
|-----|--------|-------------|
| SUPER_ADMIN | admin@resortnirjon.com | Admin@12345 |
| MANAGER | manager@resortnirjon.com | Manager@12345 |
| RECEPTIONIST | receptionist@resortnirjon.com | Reception@12345 |
| HOUSEKEEPING | housekeeping@resortnirjon.com | House@12345 |
| RESTAURANT_STAFF | restaurant@resortnirjon.com | Resto@12345 |
| ACCOUNTANT | accountant@resortnirjon.com | Account@12345 |

প্রোডাকশনে এই পাসওয়ার্ড অবশ্যই বদলাবে।

RBAC: অ্যাডমিন UI → `apps/admin/src/config/rbac.ts` (ডাইনামিক সাইডবার, `RoleGuard`, `/unauthorized`)। API → `apps/server/src/routes/*.ts`-এ পারমিশন অনুযায়ী `roleCheck` ও `apps/server/src/index.ts`। সংক্ষেপে: **Settings ও `/api/users` শুধু `SUPER_ADMIN`**; ম্যানেজার সেটিংস/স্টাফ API পায় না; **পেমেন্ট** টেবিলে Receptionist টাকা রেকর্ড করতে পারে (`POST`) কিন্তু `PUT` করে স্টেটাস edits শুধু `SUPER_ADMIN` / `MANAGER` / `ACCOUNTANT`। পাবলিক `POST /api/auth/register` শুধু `RECEPTIONIST` তৈরি করে।
