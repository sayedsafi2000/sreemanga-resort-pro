FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Override Coolify's NODE_ENV=production injection inline
RUN NODE_ENV=development npm ci --include=dev

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use bash so we can capture full output to a file that survives to the runtime stage
SHELL ["/bin/bash", "-c"]

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ARG NEXT_PUBLIC_USE_DUMMY_API=false

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_DUMMY_API=$NEXT_PUBLIC_USE_DUMMY_API

# Build with full output captured to file. ALWAYS exit 0 so Coolify keeps the layer.
# We will inspect /app/build.log from the runtime container regardless of build success.
RUN set +e; \
    NODE_ENV=development ./node_modules/.bin/next build > /app/build.log 2>&1; \
    BUILD_EXIT=$?; \
    echo "BUILD_EXIT=$BUILD_EXIT" >> /app/build.log; \
    echo "==== build.log preview ====" >&2; \
    tail -n 100 /app/build.log >&2; \
    echo "==========================" >&2; \
    if [ ! -d /app/.next/standalone ]; then \
      mkdir -p /app/.next/standalone; \
      cp /app/build.log /app/.next/standalone/build.log; \
      echo "console.log('Build failed — see build.log'); process.exit(1);" > /app/.next/standalone/server.js; \
      mkdir -p /app/.next/static; \
      mkdir -p /app/public; \
    fi; \
    exit 0

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/build.log /app/build.log

EXPOSE 80

CMD ["node", "server.js"]
