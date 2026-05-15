FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Force install of devDependencies regardless of NODE_ENV being injected by Coolify.
ENV NODE_ENV=development

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

RUN npm config set production false \
 && npm config set fund false \
 && npm config set audit false \
 && npm install --include=dev --no-audit --no-fund

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate

# Build (need dev deps for tsx/typescript) - use direct binary path
RUN ./node_modules/.bin/tsc

# Now switch to production for runtime but keep tsx for seeding
RUN npm install tsx --save-dev --no-save || true

ENV NODE_ENV=production
RUN npm prune --omit=dev || true
RUN npm install prisma@5.22.0 --no-save || true

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
