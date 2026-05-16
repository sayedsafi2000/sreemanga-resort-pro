#!/bin/sh
set -e

echo "→ Running prisma db push (sync schema)..."
npx prisma db push

# Auto-run seed on every container start.
# Seed uses upsert so re-running is safe and won't duplicate data.
# Set SKIP_SEED=true in env to disable.
if [ "${SKIP_SEED}" != "true" ]; then
  echo "→ Running seed (idempotent — safe to re-run)..."
  npx tsx prisma/seed.ts || echo "⚠️  Seed failed but continuing; check logs above."
else
  echo "→ SKIP_SEED=true — skipping seed."
fi

echo "→ Starting server..."
exec node dist/index.js
