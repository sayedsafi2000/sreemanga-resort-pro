# syntax=docker/dockerfile:1
# Pina Vista API — multi-stage build. Listens on $PORT (8000 in docker-compose).
# Start-up (docker-entrypoint.sh): prisma db push → seed if the DB is empty → node dist/index.js

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Dev deps are needed for prisma generate + tsc, whatever NODE_ENV the platform injects.
RUN npm ci --include=dev --no-audit --no-fund
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npx tsc

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8000
COPY package.json package-lock.json ./
# Production deps only. `prisma` (CLI for `db push`) and `tsx` (runs prisma/seed.ts) are regular
# dependencies precisely so the runtime image has them.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY scripts/db-is-empty.cjs ./scripts/db-is-empty.cjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
