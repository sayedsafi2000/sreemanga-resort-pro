FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Inline NODE_ENV=development overrides any NODE_ENV=production injected by Coolify
# for this single command, forcing devDependencies to install.
RUN NODE_ENV=development npm install --include=dev --no-audit --no-fund

COPY . .

ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_PUBLIC_SITE_URL=http://localhost:3002

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

# Use direct binary path with inline NODE_ENV=development
RUN NODE_ENV=development ./node_modules/.bin/tsc && NODE_ENV=development ./node_modules/.bin/vite build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
