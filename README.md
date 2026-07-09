# sreemanga-resort-pro

Resort management system with Express API, Admin dashboard (Vite), and public website (Next.js).

## Quick start (Docker development)

### Prerequisites

- [Docker](https://docs.docker.com/engine/install/) or [Podman](https://podman.io/docs/installation)
- [Docker Compose](https://docs.docker.com/compose/install/) or [Podman Compose](https://github.com/containers/podman-compose)

On **Fedora with SELinux + Podman**, the dev compose file disables the container SELinux label for app services so bind mounts work with `podman compose`. Start the stack before seeding:

```bash
podman-compose -f docker-compose.dev.yml up -d
podman-compose -f docker-compose.dev.yml exec api npm run db:seed
```

### First-time setup

Build images once, then start all services:

```bash
# Docker
docker compose -f docker-compose.dev.yml up --build -d

# Podman
podman-compose -f docker-compose.dev.yml up --build -d
```

| Service | URL | Description |
|---------|-----|-------------|
| api | http://localhost:8000 | Express REST API (hot-reload) |
| web | http://localhost:3002 | Next.js public site (hot-reload) |
| admin | http://localhost:8001 | Vite admin dashboard (hot-reload) |
| db | localhost:5432 | PostgreSQL 16 (`resort` / `resort` / `resort_management`) |

Host ports match `docker-compose.local.yml` for API and web. Admin uses port **8001** in dev (same as native Vite); production local compose maps admin to **3003**.

### Day-to-day development

No rebuild needed for normal work — source edits hot-reload via bind mounts:

```bash
# Docker
docker compose -f docker-compose.dev.yml up -d

# Podman
podman-compose -f docker-compose.dev.yml up -d
```

**Source code** — edit files under `apps/*/src` (and `apps/web` config); changes apply immediately.

**New npm packages** — update `package.json` / `package-lock.json`, then restart the affected service (dependencies install automatically on start):

```bash
docker compose -f docker-compose.dev.yml restart api   # or admin / web
```

**Rebuild images** only when Dockerfiles change:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

### Seed the database

Run once after the first start:

```bash
# Docker
docker compose -f docker-compose.dev.yml exec api npm run db:seed

# Podman
podman-compose -f docker-compose.dev.yml exec api npm run db:seed
```

Default admin login after seeding:

| Email | Password | Role |
|-------|----------|------|
| admin@resortnirjon.com | Admin@12345 | SUPER_ADMIN |

See `docs/ROLES_AND_USERS.md` for all seeded users.

### Logs and stop

```bash
# Follow all services
docker compose -f docker-compose.dev.yml logs -f

# Single service
docker compose -f docker-compose.dev.yml logs -f api

# Stop (keeps database volume)
docker compose -f docker-compose.dev.yml down

# Stop and wipe database
docker compose -f docker-compose.dev.yml down -v
```

### Custom host ports

Override ports if 8000 / 3002 / 8001 are already in use (same env vars as production local compose):

```bash
RESORT_API_HOST_PORT=18000 RESORT_WEB_HOST_PORT=13002 RESORT_ADMIN_HOST_PORT=18001 \
  docker compose -f docker-compose.dev.yml up -d
```

---

## Local development (without Docker)

Run the three apps and PostgreSQL directly on your machine.

### Prerequisites

- **Node.js 20+** and **npm**
- **PostgreSQL 16** running locally (or only run the `db` service from Docker — see below)

### 1. Install dependencies

From the repo root:

```bash
npm run install:all
```

### 2. Database

Create a database and user (example):

```sql
CREATE USER resort WITH PASSWORD 'resort';
CREATE DATABASE resort_management OWNER resort;
```

Or start only Postgres via Docker:

```bash
docker compose -f docker-compose.dev.yml up -d db
```

### 3. Environment files

Copy the examples and adjust as needed:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/web/.env.example apps/web/.env
```

Minimum server settings in `apps/server/.env`:

```env
PORT=8000
DATABASE_URL="postgresql://resort:resort@localhost:5432/resort_management?schema=public"
JWT_SECRET="dev-jwt-secret-change-me"
CORS_ORIGIN="http://localhost:3002,http://localhost:8001"
ADMIN_URL="http://localhost:8001"
```

`apps/admin/.env` and `apps/web/.env` defaults already point at `localhost:8000` and `localhost:3002`.

### 4. Sync schema and seed

From the repo root:

```bash
npm run db:push
cd apps/server && npm run db:seed
```

### 5. Start dev servers

**All three apps** (from repo root):

```bash
npm run dev
```

**Or individually** in separate terminals:

```bash
npm run dev:server   # API → http://localhost:8000
npm run dev:admin    # Admin → http://localhost:8001
npm run dev:web      # Web → http://localhost:3002
```

### 6. After adding npm packages

Install in the relevant app directory, then restart that dev server:

```bash
cd apps/server && npm install some-package
# restart dev:server
```

---

## Docker Compose files

| File | When to use |
|------|-------------|
| `docker-compose.dev.yml` | **Daily development** — hot-reload, bind mounts, dev Dockerfiles |
| `docker-compose.yml` | **Production base** — built images, no host ports (Coolify/VPS) |
| `docker-compose.local.yml` | **Production on localhost** — combine with `docker-compose.yml` to publish ports |
| `docker-compose.coolify.yml` | **Coolify entrypoint** — includes `docker-compose.yml` |

**Coolify / VPS:** `docker-compose.yml` or `docker-compose.coolify.yml` only — **not** `docker-compose.local.yml` or `docker-compose.dev.yml`.

### Production on localhost

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build -d
```

| Service | URL |
|---------|-----|
| api | http://localhost:8000 |
| web | http://localhost:3002 |
| admin | http://localhost:3003 |

### Coolify / VPS deployment

Set `docker-compose.coolify.yml` as the compose file in Coolify. Configure `NEXT_PUBLIC_API_URL`, `VITE_API_URL`, and `CORS_ORIGIN` to your public HTTPS URLs. See comments in `docker-compose.yml` and `docker-compose.coolify.yml`.

## Project structure

```
apps/
├── server/     Express + Prisma + PostgreSQL REST API
├── admin/      React + Vite SPA (staff back-office)
└── web/        Next.js 14 App Router (public site)
```

See `CLAUDE.md` for detailed architecture docs, RBAC rules, and development commands.
