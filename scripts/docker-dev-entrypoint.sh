#!/bin/sh
# Installs dependencies when package-lock.json changes, then runs the dev command.
# Optional --prisma: regenerate client and sync schema (API only).
set -e

install_deps() {
  HASH_FILE=/app/node_modules/.package-lock.hash

  if [ ! -f package-lock.json ]; then
    echo "→ No package-lock.json — running npm install..."
    npm install --include=dev
    return
  fi

  CURRENT=$(sha256sum package-lock.json | awk '{print $1}')
  if [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE")" != "$CURRENT" ]; then
    echo "→ package-lock.json changed — running npm ci..."
    npm ci --include=dev
    echo "$CURRENT" > "$HASH_FILE"
  fi
}

run_prisma() {
  echo "→ Generating Prisma client..."
  npx prisma generate

  echo "→ Syncing database schema (db push)..."
  npx prisma db push --accept-data-loss
}

install_deps

if [ "$1" = "--prisma" ]; then
  shift
  run_prisma
fi

exec "$@"
