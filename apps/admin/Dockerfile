FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Use --include=dev to force devDependencies install regardless of NODE_ENV
# Coolify injects NODE_ENV=production as a build-arg which would skip devDeps
RUN npm ci --include=dev

COPY . .

ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_PUBLIC_SITE_URL=http://localhost:3002

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
