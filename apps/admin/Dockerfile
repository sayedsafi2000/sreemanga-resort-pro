FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

# Force development so devDependencies (vite, typescript) are always installed
# regardless of what Coolify injects via --build-arg NODE_ENV=production
ENV NODE_ENV=development
RUN npm ci

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
