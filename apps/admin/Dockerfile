FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || true

COPY . .

ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_PUBLIC_SITE_URL=http://localhost:3002

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

# Force development mode for build so all deps install
ENV NODE_ENV=development

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
