FROM node:20-bookworm-slim

WORKDIR /app

# Build args from Coolify
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ARG NEXT_PUBLIC_USE_DUMMY_API=false

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_USE_DUMMY_API=$NEXT_PUBLIC_USE_DUMMY_API
ENV NEXT_TELEMETRY_DISABLED=1

# Install ALL deps (incl. dev) — inline NODE_ENV=development overrides any
# Coolify-injected NODE_ENV=production for this single command.
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm ci --include=dev

COPY . .

# Build with NODE_ENV=production so Next.js uses production react-dom server.
# (NODE_ENV=development during build causes prerender failures in Next 14.2.)
RUN NODE_ENV=production ./node_modules/.bin/next build

# Runtime
ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME=0.0.0.0

EXPOSE 80

CMD ["./node_modules/.bin/next", "start", "-p", "80", "-H", "0.0.0.0"]
