#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d before nginx starts.
# Writes /env.js so the SPA learns the API URL from the container environment
# (docker-compose sets API_URL=https://<api-domain>/api) instead of at build time.
set -e
html_dir="${NGINX_HTML_DIR:-/usr/share/nginx/html}"
api=$(printf '%s' "${API_URL:-}" | tr -d '"\\')
site=$(printf '%s' "${PUBLIC_SITE_URL:-}" | tr -d '"\\')
cat > "${html_dir}/env.js" <<JS
window.__ENV__ = { API_URL: "${api}", SITE_URL: "${site}" };
JS
echo "env.js → API_URL=${api:-<unset — falling back to the build-time VITE_API_URL>}"
