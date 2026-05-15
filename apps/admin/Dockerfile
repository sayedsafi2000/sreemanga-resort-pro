FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Force install of devDependencies regardless of NODE_ENV being injected by Coolify.
RUN npm config set production false \
 && npm config set fund false \
 && npm config set audit false \
 && npm install --include=dev --no-audit --no-fund

COPY . .

ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_PUBLIC_SITE_URL=http://localhost:3002

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV NODE_ENV=development

# Use direct binary path so npm script wrapper doesn't strip PATH
RUN ./node_modules/.bin/tsc && ./node_modules/.bin/vite build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
