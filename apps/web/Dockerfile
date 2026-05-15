FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Inline NODE_ENV=development overrides any NODE_ENV=production injected by Coolify
# for this single command, forcing devDependencies to install.
RUN NODE_ENV=development npm install --include=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ARG NEXT_PUBLIC_USE_DUMMY_API=false

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_DUMMY_API=$NEXT_PUBLIC_USE_DUMMY_API

# Run next build with full diagnostic output on failure.
# This makes the actual build error visible in Coolify logs.
RUN set -e; \
    echo "=== Starting next build ==="; \
    echo "Node: $(node --version), NPM: $(npm --version)"; \
    echo "NODE_ENV=$NODE_ENV (will override to development for build)"; \
    NODE_ENV=development ./node_modules/.bin/next build 2>&1 || { \
      echo "=== BUILD FAILED — diagnostic info ==="; \
      echo "--- next.config.js ---"; cat next.config.js 2>&1 || true; \
      echo "--- node_modules/.bin sample ---"; ls node_modules/.bin/ 2>&1 | head -20 || true; \
      echo "--- env NEXT_PUBLIC_* ---"; env | grep NEXT_PUBLIC || true; \
      exit 1; \
    }

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

EXPOSE 3002

CMD ["node", "server.js"]
