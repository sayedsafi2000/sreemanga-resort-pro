#!/bin/sh
set -e

echo "→ Running prisma db push (sync schema)..."
# --accept-data-loss: required for non-destructive schema changes that Prisma
# flags as "possible data loss" (e.g. adding a unique constraint on a new
# nullable column). Without it the push exits non-zero and `set -e` aborts the
# container before the server starts, causing a restart loop.
npx prisma db push --accept-data-loss

# Seed is OFF by default to protect production data from being overwritten.
# To run the seed manually:
#   1. Set RUN_SEED=true in Coolify env vars and redeploy, OR
#   2. From Coolify terminal:  npx tsx prisma/seed.ts
if [ "${RUN_SEED}" = "true" ]; then
  echo "→ RUN_SEED=true — running seed..."
  npx tsx prisma/seed.ts || echo "⚠️  Seed failed but continuing; check logs above."
else
  echo "→ Skipping seed (RUN_SEED!=true). Set RUN_SEED=true to enable."
fi

echo "→ Starting server..."
exec node dist/index.js
