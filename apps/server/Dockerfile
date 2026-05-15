FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Inline NODE_ENV=development overrides any NODE_ENV=production injected by Coolify
# for these build commands, forcing devDependencies to install.
RUN NODE_ENV=development npm install --include=dev --no-audit --no-fund

# Generate Prisma client
RUN NODE_ENV=development ./node_modules/.bin/prisma generate

# Build (need dev deps for tsx/typescript) - use direct binary path
RUN NODE_ENV=development ./node_modules/.bin/tsc

# Now switch to production for runtime but keep tsx for seeding
RUN npm install tsx --save-dev --no-save || true

ENV NODE_ENV=production
RUN npm prune --omit=dev || true
RUN npm install prisma@5.22.0 --no-save || true

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
