#!/bin/sh
# Container start-up for the API.
#   1. Sync the Prisma schema to the database (this repo uses `db push`, not migrations).
#   2. Seed demo users/settings ONLY when the database has no users yet (first boot),
#      or when RUN_SEED=true is set explicitly. The seed upserts settings, so it must
#      not run on every deploy — it would overwrite values changed in the admin panel.
#   3. Start the server.
set -e

echo "→ prisma db push (sync schema)"
# --accept-data-loss: additive changes Prisma flags as "possible data loss" (e.g. a new unique
# column) would otherwise exit non-zero and put the container in a restart loop.
npx prisma db push --skip-generate --accept-data-loss

if [ "${SEED_ON_EMPTY_DB:-true}" = "true" ]; then
  if node scripts/db-is-empty.cjs; then
    echo "→ empty database — seeding demo users, rooms and settings (see docs/ROLES_AND_USERS.md; change the passwords!)"
    npx tsx prisma/seed.ts
  else
    echo "→ database already has users — skipping seed"
  fi
fi
if [ "${RUN_SEED}" = "true" ]; then
  echo "→ RUN_SEED=true — running seed on request"
  npx tsx prisma/seed.ts
fi

echo "→ starting API on port ${PORT:-8000}"
exec node dist/index.js
