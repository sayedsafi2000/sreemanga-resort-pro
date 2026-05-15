FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Inline NODE_ENV=development overrides Coolify's NODE_ENV=production injection
RUN NODE_ENV=development npm install --include=dev --no-audit --no-fund

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use bash so PIPESTATUS is available
SHELL ["/bin/bash", "-c"]

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ARG NEXT_PUBLIC_USE_DUMMY_API=false

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_DUMMY_API=$NEXT_PUBLIC_USE_DUMMY_API

# Run next build. If it fails, dump the last 200 lines of build output
# directly into the Docker error stream so Coolify shows the real error.
RUN NODE_ENV=development ./node_modules/.bin/next build 2>&1 | tee /tmp/build.log; \
    BUILD_EXIT=${PIPESTATUS[0]}; \
    if [ "$BUILD_EXIT" != "0" ]; then \
      echo "================ BUILD FAILED — last 200 lines ================" >&2; \
      tail -n 200 /tmp/build.log >&2; \
      echo "================================================================" >&2; \
      exit "$BUILD_EXIT"; \
    fi

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
