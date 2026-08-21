#!/bin/sh
set -eu
API_PROXY_TARGET="${API_PROXY_TARGET:-https://api.mahakaram.ir}"
STUDENT_URL="${STUDENT_URL:-https://st.mahakaram.ir}"
ADMIN_URL="${ADMIN_URL:-https://admin.mahakaram.ir}"
NOTES="${APP_RELEASE_NOTES:-بازسازی پنل مشاور: برنامه‌ریز و JSON، آزمون و سؤال، درخواست تلاش مجدد، اعلان‌ها، گفت‌وگو و نشست پایدار.}"
if [ -n "${APP_VERSION:-}" ]; then VERSION="$APP_VERSION"; elif [ -f /build-version ]; then VERSION="$(cat /build-version)"; else VERSION="1.4.2"; fi
cat > /usr/share/nginx/html/config.js <<CFG
window.APP_CONFIG = { API_BASE_URL: '/api/v1', APP_VERSION: '${VERSION}', STUDENT_URL: '${STUDENT_URL}', ADMIN_URL: '${ADMIN_URL}' };
CFG
printf '{"version":"%s","notes":"%s"}\n' "$VERSION" "$NOTES" > /usr/share/nginx/html/version.json
sed "s/__APP_VERSION__/${VERSION}/g" /usr/share/nginx/html/sw.template.js > /usr/share/nginx/html/sw.js
ESCAPED_TARGET="$(printf '%s' "$API_PROXY_TARGET" | sed 's/[&|]/\\&/g')"
sed "s|__API_PROXY_TARGET__|${ESCAPED_TARGET}|g" /usr/share/nginx/html/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
