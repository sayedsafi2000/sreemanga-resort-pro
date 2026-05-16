#!/bin/sh
set -e

echo "→ Running prisma db push (sync schema)..."
npx prisma db push

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
