#!/bin/sh
set -eu
API_PROXY_TARGET="${API_PROXY_TARGET:-https://api.mahakaram.ir}"
STUDENT_URL="${STUDENT_URL:-https://st.mahakaram.ir}"
ADMIN_URL="${ADMIN_URL:-http://localhost:8081}"
NOTES="${APP_RELEASE_NOTES:-آزمون زمان‌دار یک‌تلاشه، درخواست تلاش مجدد، اعلان و گفت‌وگوی بهتر، برنامه‌های JSON و نشست پایدار.}"
if [ -n "${APP_VERSION:-}" ]; then VERSION="$APP_VERSION"; elif [ -f /build-version ]; then VERSION="$(cat /build-version)"; else VERSION="1.4.2"; fi

# API_BASE_URL is intentionally same-origin. Do not point the browser directly
# at api.mahakaram.ir; nginx proxies /api/v1 to the configured backend instead.
cat > /usr/share/nginx/html/config.js <<CFG
window.APP_CONFIG = { API_BASE_URL: '/api/v1', APP_VERSION: '${VERSION}', STUDENT_URL: '${STUDENT_URL}', ADMIN_URL: '${ADMIN_URL}' };
CFG
printf '{"version":"%s","notes":"%s"}\n' "$VERSION" "$NOTES" > /usr/share/nginx/html/version.json
sed "s/__APP_VERSION__/${VERSION}/g" /usr/share/nginx/html/sw.template.js > /usr/share/nginx/html/sw.js

ESCAPED_TARGET="$(printf '%s' "$API_PROXY_TARGET" | sed 's/[&|]/\\&/g')"
sed "s|__API_PROXY_TARGET__|${ESCAPED_TARGET}|g" /usr/share/nginx/html/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
