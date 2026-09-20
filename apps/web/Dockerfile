# syntax=docker/dockerfile:1
# Pina Vista public site (Next.js 14) — `next start` on :3002.
# NEXT_PUBLIC_* values are baked at build time; the browser API URL can ALSO be supplied at runtime
# via PUBLIC_API_URL (the root layout injects it as window.__ENV__), and SSR uses INTERNAL_API_URL,
# so the image works even when the API domain is not known when the image is built.

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/public
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_USE_DUMMY_API=false NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY next.config.js ./
RUN chown -R node:node /app
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=8s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3002)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "./node_modules/.bin/next start -p ${PORT:-3002} -H 0.0.0.0"]
