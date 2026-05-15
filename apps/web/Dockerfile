FROM node:20-bookworm-slim

WORKDIR /app

# Build args from Coolify
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ARG NEXT_PUBLIC_USE_DUMMY_API=false

# Force NODE_ENV=development for the entire build, regardless of Coolify injection
ENV NODE_ENV=development
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_DUMMY_API=$NEXT_PUBLIC_USE_DUMMY_API
ENV NEXT_TELEMETRY_DISABLED=1

# Install certs for any HTTPS calls during build
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy and install
COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund 2>&1 | tail -50

COPY . .

# Build with explicit error reporting. If anything fails, print the full output.
RUN ./node_modules/.bin/next build 2>&1 || (echo '=== NEXT BUILD FAILED ===' && exit 1)

# Switch to production for runtime
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

EXPOSE 3002

CMD ["./node_modules/.bin/next", "start", "-p", "3002"]
