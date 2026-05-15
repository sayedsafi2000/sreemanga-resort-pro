FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Use --include=dev to force devDependencies install regardless of NODE_ENV
# Coolify injects NODE_ENV=production as a build-arg which would skip devDeps
ENV NODE_ENV=development

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Build (need dev deps for tsx/esbuild)
RUN npm run build

# Now switch to production for runtime but keep tsx for seeding
RUN npm install tsx --save-dev --no-save || true

ENV NODE_ENV=production
RUN npm prune --omit=dev || true
RUN npm install prisma@5.22.0 --no-save || true

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
