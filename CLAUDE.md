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

# Lint (admin + web only; no server lint in root script)
npm run lint
npm run lint:admin
npm run lint:web

# Server-only lint
cd apps/server && npm run lint

# DB ops (run from root; delegate to apps/server)
npm run db:generate   # prisma generate
npm run db:push       # prisma db push (no migrations dir tracked — see .gitignore)
npm run db:studio     # prisma studio

# Server-only DB
cd apps/server && npm run db:migrate   # prisma migrate dev
cd apps/server && npm run db:seed      # seeds demo users (see docs/ROLES_AND_USERS.md)
```

No test runner configured. No CI config in repo.

## Port + URL conventions

Defaults are inconsistent across apps — confirm via env before assuming:

- Server `PORT` defaults to `3001` in `apps/server/src/index.ts`, but root `dev:server` script kills `:8000` and admin Vite proxies `/api` → `http://localhost:8000`. Set `PORT=8000` in `apps/server/.env` to match dev wiring.
- Admin: `VITE_API_URL` (defaults `http://localhost:8000/api`).
- Web: `NEXT_PUBLIC_API_URL` (defaults `http://localhost:3001/api`) — points at server too. Align with whichever port server actually runs on.
- Server `CORS_ORIGIN`: comma-separated list of allowed origins (defaults `http://localhost:3000,http://localhost:3001`). Add admin (`:8001`) and web (`:3002`) origins explicitly when developing.

`.env` files are gitignored. Required server env: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`.

## Architecture

### Server (`apps/server/src`)

Standard layered Express:

- `index.ts` — single entrypoint. Mounts route modules under `/api/*`. Auth + role gating applied at mount level (not in route files). Examples:
  - `app.use('/api/users', authenticateToken, roleCheck(['SUPER_ADMIN']), userRoutes)`
  - `app.use('/api/reports', authenticateToken, roleCheck(['SUPER_ADMIN','MANAGER','ACCOUNTANT']), reportRoutes)`
  - Public, no auth: `/api/auth`, `/api/public`.
- `middleware/auth.ts` — `authenticateToken` decodes JWT (`JWT_SECRET`), refetches `User` from DB, attaches to `req.user`. Adds `Express.Request.user` typing globally.
- `middleware/roleCheck.ts` — `roleCheck(roles[])` factory.
- `controllers/`, `routes/`, `validators/` (zod), `utils/` — one file per domain (booking, room, guest, payment, restaurant, report, expenditure, salary, gallery, blog, nearby spots, settings, user, auth, public).
- `prisma/schema.prisma` — Postgres. Domains: User (with `Role` enum), Room, Booking, Guest, Payment, RestaurantMenu/Order, Expense + ExpenseCategory, StaffSalary, Setting, SiteGalleryItem, SiteNearbySpot, SiteBlog. `Site*` models are public-site CMS content edited from admin.
- `prisma/seed.ts` — seeds demo users for each role.

When adding a new domain endpoint: create `controllers/xController.ts`, `routes/xRoutes.ts`, optional `validators/xValidator.ts`, then mount in `index.ts` with the right `roleCheck`. Authz lives at the mount, not in handlers — keep it that way.

### Admin (`apps/admin/src`)

Vite SPA. JWT stored in `localStorage` and attached by `lib/api.ts` axios interceptor; 401 response clears storage and redirects to `/login`. Path alias `@` → `apps/admin/src` (configured in `vite.config.ts` and `tsconfig.json`).

Page structure: `pages/<Domain>/<Domain>.tsx` (Login, Dashboard, Rooms, Bookings, Guests, Payments, Restaurant, Settings, Users, Reports, Gallery, NearbyExplore, Blogs, Expenditures, StaffSalaries, Unauthorized). All routes wrapped by `<ProtectedRoute>` + `<RoleGuard>` from `App.tsx`.

UI: shadcn-style components on `@radix-ui/*` primitives + Tailwind. Charts via `recharts` and `chart.js`/`react-chartjs-2`. Date picking via `react-day-picker`.

Three Tailwind config files exist (`tailwind.config.cjs`, `.js`, `.ts`). `next.config.mjs` is also present even though admin is Vite — likely vestigial. Don't add new configs; reuse the active one (`tailwind.config.js` is what PostCSS picks up by default).

### Web (`apps/web/src`)

Next.js 14 App Router. Routes: `app/{rooms,booking,gallery,explore,blogs,restaurant,contact}` plus root `page.tsx`. SEO surface: `sitemap.ts`, `robots.ts`, `not-found.tsx`. Server-rendered, talks to API server through `lib/api.ts` axios client. No auth — public site only.

`lib/resort-api.ts` and `lib/translations.ts` (Bengali/English) are domain helpers; `lib/dummy-data.ts` exists as fallback content.

### RBAC

Single source of truth lives in two coordinated places:

- API: `apps/server/src/index.ts` + per-route `roleCheck`.
- Admin UI: `apps/admin/src/config/rbac.ts` (`ROUTE_ACCESS`, `getSidebarItems`, `canAccessPath`, `canManageRooms`, `canManageRestaurantMenu`, `canEditPayments`).

When changing role permissions, update **both**. Roles: `SUPER_ADMIN`, `MANAGER`, `RECEPTIONIST`, `HOUSEKEEPING`, `RESTAURANT_STAFF`, `ACCOUNTANT`. Notable rules from `docs/ROLES_AND_USERS.md`:

- `Settings` and `/api/users` → `SUPER_ADMIN` only.
- Manager has no settings/staff API access.
- Receptionist can `POST` payments; payment status `PUT` is `SUPER_ADMIN` / `MANAGER` / `ACCOUNTANT` only.
- Public `POST /api/auth/register` only creates `RECEPTIONIST` users.

Demo credentials for seeded users live in `docs/ROLES_AND_USERS.md`.

## Conventions

- Server: zod validators in `validators/`, async handlers via `express-async-handler`, central `errorHandler` middleware.
- Prisma: `prisma/migrations` is gitignored — workflow uses `db:push` for dev, not committed migrations. Don't assume migration history exists.
- Frontend currency/date: `date-fns` everywhere; admin and web both pull it.
- Bilingual (Bengali/English) UI strings live in `apps/web/src/lib/translations.ts`.
