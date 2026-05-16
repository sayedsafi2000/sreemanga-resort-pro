FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Override Coolify's NODE_ENV=production for build stage
ARG NODE_ENV=development

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Install all dependencies including devDeps for build
# Use NODE_ENV=development inline to ignore any Coolify-injected NODE_ENV=production
RUN NODE_ENV=development npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Build (need dev deps for tsx/esbuild) - use direct binary path
RUN NODE_ENV=development ./node_modules/.bin/tsc

# Now switch to production for runtime but keep tsx for seeding
RUN npm install tsx --save-dev --no-save || true

ENV NODE_ENV=production
ENV PORT=80
RUN npm prune --omit=dev || true
RUN npm install prisma@5.22.0 --no-save || true

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
