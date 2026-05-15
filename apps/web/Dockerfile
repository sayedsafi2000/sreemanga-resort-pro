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

# Install deps with NODE_ENV=development inline so devDependencies are included
# regardless of any NODE_ENV=production injected by Coolify build-args.
COPY package.json package-lock.json* ./
RUN NODE_ENV=development npm ci --include=dev

COPY . .

# Build using direct binary path (avoids npm script PATH issues) with
# inline NODE_ENV=development to keep dev deps active during build.
RUN NODE_ENV=development ./node_modules/.bin/next build

# Switch to production for runtime
ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME=0.0.0.0

EXPOSE 80

CMD ["./node_modules/.bin/next", "start", "-p", "80", "-H", "0.0.0.0"]
