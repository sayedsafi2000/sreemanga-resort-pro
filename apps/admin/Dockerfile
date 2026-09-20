# syntax=docker/dockerfile:1
# Pina Vista admin (Vite SPA) served by nginx on :80.
# The API URL is read at RUNTIME from the API_URL env var (docker/40-env-js.sh writes /env.js),
# so the image does not need to know the API domain when it is built. VITE_API_URL is only a
# build-time fallback.

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
ARG VITE_API_URL=
ARG VITE_PUBLIC_SITE_URL=
ENV VITE_API_URL=$VITE_API_URL VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
