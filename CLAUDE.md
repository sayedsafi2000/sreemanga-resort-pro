# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Monorepo with three apps under `apps/`. Root `package.json` orchestrates via `concurrently`. No workspaces — each app has own `node_modules` and `package-lock.json`.

- `apps/server` — Express + Prisma + PostgreSQL REST API. TypeScript via `tsx watch`.
- `apps/admin` — React 18 + Vite SPA. Staff back-office UI. Routed via `react-router-dom`.
- `apps/web` — Next.js 14 (App Router) public-facing marketing/booking site.

## Common commands

Run from repo root unless noted.

```bash
# First-time setup: install all three apps + root
npm run install:all

# Dev (all three concurrently). Server predev runs `prisma generate`.
npm run dev

# Single app
npm run dev:server   # server on port from $PORT (root script kills :8000 first)
npm run dev:admin    # vite on :8001 with /api proxy -> :8000
npm run dev:web      # next on :3002

# Build
npm run build                # all
npm run build:{server,admin,web}

# Lint — only the server has an ESLint config (`apps/server/.eslintrc.cjs`).
# Root `npm run lint` fails today: admin/web have no ESLint config and web has no lint script.
cd apps/server && npm run lint

# Server unit tests (Vitest, apps/server/tests/, no DB needed)
cd apps/server && npm test

# DB ops (run from root; delegate to apps/server)
npm run db:generate   # prisma generate
npm run db:push       # prisma db push (no migrations dir tracked — see .gitignore)
npm run db:studio     # prisma studio

# Server-only DB
cd apps/server && npm run db:migrate   # prisma migrate dev
cd apps/server && npm run db:seed      # seeds demo users (see docs/ROLES_AND_USERS.md)
```

Tests: the server has Vitest unit tests in `apps/server/tests/` (pure helpers + middleware, no DB needed) — `npm run test:server` from root or `npm test` in `apps/server`. Admin and web have no tests yet; `docs/plan/08-TESTING.md` describes the intended strategy.

## Port + URL conventions

Defaults are inconsistent across apps — confirm via env before assuming:

- Server `PORT` defaults to `8000` in `apps/server/src/index.ts`; admin Vite proxies `/api` → `http://localhost:8000`. Keep `PORT=8000` in `apps/server/.env`.
- Admin: `VITE_API_URL` (defaults `http://localhost:8000/api`).
- Web: `NEXT_PUBLIC_API_URL` (defaults `http://localhost:3001/api`) — points at server too. Align with whichever port server actually runs on.
- Server `CORS_ORIGIN`: comma-separated list of allowed origins (defaults `http://localhost:3000,http://localhost:3001`). Add admin (`:8001`) and web (`:3002`) origins explicitly when developing.

`.env` files are gitignored. Required server env: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`. Optional: `JWT_EXPIRES_IN`, `ADMIN_URL` (password-reset links), `WEB_PUBLIC_URL` (Stripe success/cancel redirects), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (card payments; unset = disabled), `TRUST_PROXY` (reverse-proxy hops; defaults to `1` in production so per-IP rate limiting works behind Coolify/nginx), `API_RATE_LIMIT_PER_MIN` (global API cap, default 600/min; signed-in requests are bucketed per bearer token so staff sharing the office IP don't throttle each other — see `middleware/rateLimiter.ts`), `AUTH_RATE_LIMIT_PER_15MIN` (login/register attempts per IP, default 20 — raise only for automated QA). `apps/server/.env.example` documents all of them.

Email (server, all optional — picked in priority order by `utils/emailService.ts`): set `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS` for any SMTP, **or** `RESEND_API_KEY`, **or** `BREVO_API_KEY`+`BREVO_EMAIL`. With none set, email silently no-ops (logs a warning). `RESORT_NAME` (default `Pina Vista`) and `EMAIL_FROM` set the brand/sender on every template.

Web public (`NEXT_PUBLIC_*`, shown to guests on the booking page): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BKASH_NUMBER`, `NEXT_PUBLIC_BANK_NAME`, `NEXT_PUBLIC_BANK_ACCOUNT_NAME`, `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER`, `NEXT_PUBLIC_BANK_BRANCH`.

## Architecture

### Server (`apps/server/src`)

Standard layered Express:

- `index.ts` — single entrypoint. Mounts route modules under `/api/*`. Auth + role gating applied at mount level (not in route files). Examples:
  - `app.use('/api/users', authenticateToken, roleCheck(['SUPER_ADMIN']), userRoutes)`
  - `app.use('/api/reports', authenticateToken, roleCheck(['SUPER_ADMIN','MANAGER','ACCOUNTANT']), reportRoutes)`
  - Public, no auth: `/api/auth`, `/api/public`.
- `middleware/auth.ts` — `authenticateToken` decodes JWT (`JWT_SECRET`), refetches `User` from DB, attaches to `req.user`. Adds `Express.Request.user` typing globally.
- `middleware/roleCheck.ts` — `roleCheck(roles[])` factory.
- `controllers/`, `routes/`, `validators/` (zod), `utils/` — one file per domain (booking, room, guest, payment, pendingPayment, restaurant, report, expenditure, salary, gallery, blog, nearby spots, settings, user, auth, passwordReset, branding, public).
- `utils/prisma.ts` — **singleton** `PrismaClient` (cached on `globalThis` in non-prod to survive `tsx watch` reloads). Every file does `import prisma from '../utils/prisma'`. Never `new PrismaClient()` elsewhere — that exhausts the connection pool.
- `utils/emailService.ts` — single `emailService` instance. Constructor picks one transport in priority order (SMTP env → Resend → Brevo → no-op). Exposes branded HTML templates: OTP, booking confirmation, booking pending, payment confirmation, check-in reminder, password reset. All sends are best-effort (return `false` on failure, never throw) — callers must not block the request on email.
- `utils/bookingPayment.ts` — shared booking/payment amount + status helpers.
- `prisma/schema.prisma` — Postgres. Domains: User (with `Role` enum), PasswordReset, Room, Booking, Guest, Payment, PendingPayment, RestaurantMenu/Order, Expense + ExpenseCategory, StaffSalary, Setting, SiteGalleryItem, SiteNearbySpot, SiteBlog, plus Account/ledger, Inventory, DayLong, Voucher, Staff HR, AuditLog, OtpCode and the shareholder module. `Site*` models are public-site CMS content edited from admin.

**Shareholders (`/api/shareholders`, admin `/shareholders`, portal `/api/shareholder`).** Shares are sold in fixed-price units: `ShareTier` (GOLD ৳150,000 / PLATINUM ৳300,000 by default, editable, optional `totalUnits` cap; `ensureDefaultTiers()` creates them lazily). A `ShareHolding` is one purchase of N units of a tier (price snapshotted); it may be paid in instalments (`SharePayment` rows, each posting a cash IN ledger entry by method) and becomes `ACTIVE` only when fully paid. Profit distributions split `totalProfit` by **paid-up capital** of active shareholders (`utils/shareCapital.ts` → `calculateCapitalShares`, largest-remainder rounding; purchase date is irrelevant). Each `ProfitShare` keeps `calculatedAmount` + `capitalAmount` + `sharePercent`; admins may override `amount` while DRAFT (`isManual`, `POST /distributions/:id/overrides`, `amount: null` reverts). Cancelling a paid holding can post a refund OUT; unpaid holdings can be deleted; a shareholder with any payment/distribution history is deactivated instead of deleted.
- `prisma/seed.ts` — seeds demo users for each role (logins in `docs/ROLES_AND_USERS.md`).
- `scripts/rebrand-pina-vista.ts` — one-off/idempotent data migration that rewrites Nirjon-era DB content (settings, blogs, menu, room/gallery image paths) to Pina Vista; `--dry-run` lists, `--users` also moves staff login emails to `@pinavista.com`. Run with `npx tsx` from `apps/server`.

**Booking OTP lives in the `OtpCode` table** (6-digit, 5-min TTL, one active row per email; expired rows purged every 10 min by `publicController.ts`). Public room and day-long bookings require `guestEmail` and a `verified` unexpired row for it; the row is deleted only after the booking commits, so a validation failure doesn't force re-verification. The code is delivered only by email — never logged or returned by the API — so a working email transport is required to test the booking flow locally (a failed send returns 500 and deletes the row).

**Front-desk bookings (admin `Bookings` dropdown → New Booking `/bookings/new`, Booking List `/bookings`, Reserved List `/bookings/reserved`, Monthly Calendar `/bookings/calendar`, plus `/bookings/:id/invoice` and `/bookings/:id/edit`).** Every booking has a sequential `invoiceNo` (shown as `INV-00042`, searchable), `isVip` / `isForeigner` flags, a nightly `rate` snapshot, `extraPersons` (× `Room.extraGuestCharge`), `extraCharge`+note and a `staffDiscount` (voucher discount stays in `discountAmount`); `utils/bookingPricing.ts` is the single pricing formula. "Reservation" = status `PENDING`, "Booking" = `CONFIRMED`. `POST /api/bookings` accepts an `advance` `{amount, method, transactionId}` recorded immediately as a COMPLETED payment with ledger entries; `PUT /api/bookings/:id` may change room/dates (availability re-checked, excluding itself) and nested `guest` details, recomputing the total. `GET /api/bookings` supports `search` (name/phone/email/room/INV, one box), the field-specific `name` / `phone` / `invoice` filters used by the list page's Search & Filter panel (AND-ed), `status` (comma list), `from`/`to`, `roomId`, `vip`, `foreigner`, `stakeholder` (guest matches an active shareholder by email/phone), `source=WEB|ADMIN`, `due`, `limit`/`offset`, and returns `stats` for the filter chips. `GET /api/bookings/room-availability?checkIn&checkOut[&excludeBookingId]` drives the room grid; `GET /api/bookings/calendar?month=YYYY-MM` drives the monthly calendar (days as rows × rooms as columns, resortsbd-style: red BOOKED / yellow RESERVED / grey BLOCKED cells with guest name, green Available cells with a checkbox — ticking consecutive nights of one room opens New Booking prefilled; stats chips come from `stats`). Room status only follows real occupancy (CHECKED_IN → BOOKED, CHECKED_OUT → CLEANING). Invoice text comes from Settings keys `invoiceNote`, `cancellationPolicy` (one clause per line), `checkInTime`/`checkOutTime`. One booking = one room; the New Booking page creates one invoice per selected room and splits any advance proportionally. The Booking List is laid out like resortsbd's invoice list (dark header, Search & Filter panel, Amount/Discount/Total/Paid/Due pills, coloured square action buttons); it renders as a table from 1400px and as cards below that.

**Room availability** uses half-open stays `[checkIn, checkOut)` — the checkout day is free for a new check-in. All overlap logic lives in `utils/bookingAvailability.ts`: `overlappingStayWhere` for queries/calendars, and `lockRoomForBooking` (per-room Postgres advisory lock) + `assertRoomAvailable` inside the `$transaction` that creates a booking. Don't re-implement the comparison inline.

When adding a new domain endpoint: create `controllers/xController.ts`, `routes/xRoutes.ts`, optional `validators/xValidator.ts`, then mount in `index.ts` with the right `roleCheck`. Authz lives at the mount, not in handlers — keep it that way.

### Admin (`apps/admin/src`)

Vite SPA. JWT stored in `localStorage` and attached by `lib/api.ts` axios interceptor; 401 response clears storage and redirects to `/login`. Path alias `@` → `apps/admin/src` (configured in `vite.config.ts` and `tsconfig.json`).

Page structure: `pages/<Domain>/<Domain>.tsx` (Login, Dashboard, Rooms, Bookings, Guests, Payments, Restaurant, Settings, Users, Reports, Gallery, NearbyExplore, Blogs, Expenditures, StaffSalaries, Unauthorized). All routes wrapped by `<ProtectedRoute>` + `<RoleGuard>` from `App.tsx`.

UI: shadcn-style components on `@radix-ui/*` primitives + Tailwind. Charts via `recharts` and `chart.js`/`react-chartjs-2`. Date picking via `react-day-picker`.

Three Tailwind config files exist (`tailwind.config.cjs`, `.js`, `.ts`). `next.config.mjs` is also present even though admin is Vite — likely vestigial. Don't add new configs; reuse the active one (`tailwind.config.js` is what PostCSS picks up by default).

### Web (`apps/web/src`)

Next.js 14 App Router. Routes: `app/{rooms,booking,gallery,explore,blogs,restaurant,contact}` plus root `page.tsx`. SEO surface: `sitemap.ts`, `robots.ts`, `not-found.tsx`. Server-rendered, talks to API server through `lib/api.ts` axios client. No auth — public site only.

`lib/resort-api.ts` and `lib/translations.ts` (Bengali/English) are domain helpers; `lib/dummy-data.ts` exists as fallback content.

Site imagery: the 13 Pina Vista architectural renders live once in `apps/web/public/pina-vista/` (`01-aerial-site.jpg` … `13-garden-driveway.jpg`). Import them statically via the `@public/*` tsconfig alias (`import hero from '@public/pina-vista/03-hillside-cottages.jpg'`) or reference by path (`/pina-vista/…`) for DB-stored/dummy image URLs. `next.config.js` rewrites the old seed paths (`/rooms/roomN.avif`, `/gallery/scene-N.jpg`) to these files so pre-existing DB rows still render. `src/assets/logo.jpg` is the only other static image.

Guest booking flow (`app/booking`): collect details → `POST /api/public/otp/send` → guest enters emailed 6-digit OTP → `POST /api/public/otp/verify` → `POST /api/public/bookings` (requires `guestEmail` plus a verified, unexpired `OtpCode` row for it; the row is consumed after the booking commits). Website bookings are **pay-now only** (`preferredPaymentTiming` is forced to `INSTANT` by the public schema): the guest picks bKash, Nagad or bank transfer, pays, and submits a transaction ID; "pay later" exists only for staff-created bookings in admin. The account details shown come from admin Settings → Payment Accounts (`bkashNumber`, `nagadNumber`, `bankName`, `bankBranch`, `bankAccountName`, `bankAccountNumber` keys via `/api/public/settings`); `NEXT_PUBLIC_BKASH_NUMBER` / `NEXT_PUBLIC_NAGAD_NUMBER` / `NEXT_PUBLIC_BANK_*` are optional build-time fallbacks, and an unset account renders a "call us" note rather than a placeholder number.

### RBAC

Single source of truth lives in two coordinated places:

- API: `apps/server/src/index.ts` + per-route `roleCheck`.
- Admin UI: `apps/admin/src/config/rbac.ts` (`ROUTE_ACCESS`, `getSidebarItems`, `canAccessPath`, `canManageRooms`, `canManageRestaurantMenu`, `canEditPayments`).

When changing role permissions, update **both**. Roles: `SUPER_ADMIN`, `MANAGER`, `RECEPTIONIST`, `HOUSEKEEPING`, `RESTAURANT_STAFF`, `ACCOUNTANT`, plus the external `SHAREHOLDER` portal role (logs in via `audience: 'shareholder'`, lands on `/portal`). Current mounts in `index.ts` (this is the live source of truth — `docs/ROLES_AND_USERS.md` may lag):

- `/api/users` → `SUPER_ADMIN` only.
- `/api/settings` → `SUPER_ADMIN` + `MANAGER`.
- `/api/reports`, `/api/expenditures`, `/api/salaries`, `/api/pending-payments` → `SUPER_ADMIN` + `MANAGER` + `ACCOUNTANT`.
- `/api/branding` → any authenticated staff may `GET` (the admin layout loads the logo on every page); `PUT` is `SUPER_ADMIN` + `MANAGER` inside the router.
- `/api/bookings` reads (`GET` list/detail/calendar/room-availability) are open to `ACCOUNTANT` as well as the front-desk roles; writes stay `SUPER_ADMIN`/`MANAGER`/`RECEPTIONIST`.
- `/api/rooms`, `/api/bookings`, `/api/guests`, `/api/payments`, `/api/restaurant`, `/api/vouchers`, `/api/gallery`, `/api/nearby-spots`, `/api/blogs` → any authenticated user at the mount; every handler is then gated by role arrays inside the route file (mirrored in admin `rbac.ts`).
- `/api/staff` → all staff roles (not `SHAREHOLDER`); HR data (profiles, attendance, leaves, rosters) is `SUPER_ADMIN`+`MANAGER` inside `staffRoutes.ts`, only department/designation/shift lists are open to other staff.
- `/api/day-long` → `SUPER_ADMIN`, `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`; booking create/update is `SUPER_ADMIN`/`MANAGER`/`RECEPTIONIST`.
- `/api/shareholder` (portal) → `SHAREHOLDER` only. `/api/shareholders`, `/api/accounts` → `SUPER_ADMIN`+`MANAGER`+`ACCOUNTANT`. `/api/inventory` → all staff except `RECEPTIONIST`. `/api/audit-logs` → `SUPER_ADMIN`.
- Receptionist can `POST` payments; payment status `PUT` is `SUPER_ADMIN` / `MANAGER` / `ACCOUNTANT` only.
- Public `POST /api/auth/register` is open registration but always creates a `RECEPTIONIST`; any `role` in the body is ignored. Other roles are assigned only via the `SUPER_ADMIN`-gated `/api/users`.

Public, no auth: `/api/auth` (login, register, profile, `forgot-password`/`reset-password`/`verify-reset-token`), `/api/public` (rooms, availability, settings, menu, gallery, CMS content, `POST /bookings`, `POST /otp/send`, `POST /otp/verify`).

Demo credentials for seeded users live in `docs/ROLES_AND_USERS.md`.

## Conventions

- Server: zod validators in `validators/`, async handlers via `express-async-handler`, central `errorHandler` middleware. It maps Prisma known-request errors to clean statuses (`P2025` → 404 "Record not found", `P2002` → 409, `P2003` → 409), so controllers may `delete`/`update` by id without a pre-check; `stack` is included in responses only when `NODE_ENV=development`.
- Prisma: `prisma/migrations` is gitignored — workflow uses `db:push` for dev, not committed migrations. Don't assume migration history exists.
- Frontend currency/date: `date-fns` everywhere; admin and web both pull it.
- Bilingual (Bengali/English) UI strings live in `apps/web/src/lib/translations.ts`.
