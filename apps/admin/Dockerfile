FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Override Coolify's NODE_ENV=production for build stage
ARG NODE_ENV=development

RUN NODE_ENV=development npm ci --include=dev

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
