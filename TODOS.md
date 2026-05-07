# TODOs

Items the audit (`C:\Users\KIBRIA\.claude\plans\find-out-the-lackings-spicy-peach.md`) surfaced that we deliberately deferred. Pulled out of in-code comments so a future contributor can pick one up without reading the whole audit.

## L6 — Activity log / audit trail [deferred]

**Why deferred:** needs schema + middleware + UI; cuts across every mutating route. Auto-mode batch was scoped to changes that fit a single file pattern.

**Shape when picked up:**
1. Prisma model:
   ```prisma
   model AuditLog {
     id         String   @id @default(uuid())
     userId     String?
     user       User?    @relation(fields: [userId], references: [id])
     action     String   // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | ...
     entity     String   // 'Booking' | 'Payment' | 'Setting' | ...
     entityId   String?
     before     Json?
     after      Json?
     ipAddress  String?
     userAgent  String?
     createdAt  DateTime @default(now())

     @@index([entity, entityId])
     @@index([userId])
     @@index([createdAt])
   }
   ```
2. Express middleware that wraps mutating handlers — captures req.user, route, params, body before/after the handler runs. Skip GETs and login/me endpoints.
3. Admin UI: new `/audit-log` route under SUPER_ADMIN — table + filters by entity/user/date, drill-down to before/after JSON diff.
4. Migration plan: `prisma db push` adds the table; existing data has no history (acceptable).

**Effort:** ~6h CC. ~2 days human.

## H6 — Cloud image uploads [deferred]

**Why deferred:** needs infra decision (S3 vs R2 vs Backblaze vs Fly volume), credential management, content-type validation, signed-URL flow, plus a backfill migration for every existing data-URL row across Rooms, Restaurant menu, Blogs, Gallery, NearbySpots, ManualBookingDialog payment proof, Expense receipts (PR-7).

**Current state:** all image uploads → `FileReader.readAsDataURL` → POST → stored as data URL in Postgres. PR-7 added client-side canvas resize for receipts so they don't blow past the 10mb express limit, but the underlying storage is still data URLs everywhere.

**Shape when picked up:**
1. Pick provider — Cloudflare R2 likely cheapest + zero egress for a Sreemangal-bound site.
2. Add server upload endpoint: `POST /api/uploads` accepts multipart, validates content-type, streams to bucket, returns `{ url, key }`. Gate by role (any authenticated admin role).
3. Replace each `FileReader.readAsDataURL` call site with a 2-step flow: upload → get URL → set form field to URL. Reuse one `useImageUpload()` hook.
4. Backfill script: iterate every model with image fields, decode data URL, upload to bucket, replace value with URL, save.
5. Update `next.config.js` `images.remotePatterns` to allow the bucket domain.
6. Document env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL`.

**Effort:** ~1-2 days CC including backfill. Several hours of human review.

## L8 — Server orphan endpoints [kept for forward-compat]

Reviewed during PR-13 polish bundle. Decision: keep all of these in place, no removal.

- `POST /api/auth/register` — public-by-design (per `docs/ROLES_AND_USERS.md`); only creates RECEPTIONIST role. Used by anyone setting up a fresh resort manually.
- `GET /api/auth/profile` — never called from admin yet, but powers a future "me" page.
- `GET /api/rooms/availability` — authed mirror of public endpoint. Cheap to keep; useful when admin needs same logic from inside a session.
- `GET /api/salaries/user/:userId` — useful for the salary history view that pairs with PR-1.
- `PATCH /api/salaries/:id/mark-paid` — alternate flow for the new bulk-pay endpoint added in PR-11. Either works.

If any of these are still unused 90 days from now and nothing in the roadmap targets them, delete in one PR.

## L7 follow-up — apply loading-state pattern to remaining list pages

PR-14 added the pattern to Bookings + Payments. Same change still needed on:
- `apps/admin/src/pages/Expenditures/Expenditures.tsx`
- `apps/admin/src/pages/Restaurant/Restaurant.tsx` (orders tab + menu tab)
- `apps/admin/src/pages/Guests/Guests.tsx`
- `apps/admin/src/pages/StaffSalaries/StaffSalaries.tsx`

Mechanical change — `loading` boolean + branch in empty cell. ~10 min each.

## Future considerations (not from the original audit)

- **Token-based password reset.** PR-8 swapped the dead `#` link for a `mailto:` to the resort owner. Real reset needs SMTP service (Resend / Postmark / SendGrid), token table, and email template. Not on the audit roadmap; low urgency for a single-tenant resort.
- **Rate limiting on `/api/auth/login`.** No brute-force protection at the moment. Add `express-rate-limit` middleware at mount when auth endpoint exposure increases.
- **Backup / restore docs.** Postgres in Docker means a manual `pg_dump` is the current strategy. Document it once a real backup target exists.
