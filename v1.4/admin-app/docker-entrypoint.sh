#!/bin/sh
set -eu
API_PROXY_TARGET="${API_PROXY_TARGET:-https://api.mahakaram.ir}"
LOCAL_API_PROXY_TARGET="${LOCAL_API_PROXY_TARGET:-${API_PROXY_TARGET}}"
STUDENT_URL="${STUDENT_URL:-https://st.mahakaram.ir}"
ADMIN_URL="${ADMIN_URL:-https://admin.mahakaram.ir}"
NOTES="${APP_RELEASE_NOTES:-بازسازی پنل مشاور: برنامه‌ریز و JSON، آزمون و سؤال، درخواست تلاش مجدد، اعلان‌ها، گفت‌وگو و نشست پایدار.}"
if [ -n "${APP_VERSION:-}" ]; then VERSION="$APP_VERSION"; elif [ -f /build-version ]; then VERSION="$(cat /build-version)"; else VERSION="1.6.0"; fi
case "$API_PROXY_TARGET" in
  http://*|https://*) API_PROXY_TARGET="${API_PROXY_TARGET%/}" ;;
  *) echo "API_PROXY_TARGET must start with http:// or https://" >&2; exit 1 ;;
esac
case "$LOCAL_API_PROXY_TARGET" in
  http://*|https://*) LOCAL_API_PROXY_TARGET="${LOCAL_API_PROXY_TARGET%/}" ;;
  *) echo "LOCAL_API_PROXY_TARGET must start with http:// or https://" >&2; exit 1 ;;
esac
cat > /usr/share/nginx/html/config.js <<CFG
window.APP_CONFIG = { API_BASE_URL: '/api/v1', API_SERVER_URL: '/api-server/v1', API_LOCAL_URL: '/api-local/v1', DEFAULT_API_SOURCE: 'server', APP_VERSION: '${VERSION}', STUDENT_URL: '${STUDENT_URL}', ADMIN_URL: '${ADMIN_URL}' };
CFG
printf '{"version":"%s","notes":"%s"}\n' "$VERSION" "$NOTES" > /usr/share/nginx/html/version.json
sed "s/__APP_VERSION__/${VERSION}/g" /usr/share/nginx/html/sw.template.js > /usr/share/nginx/html/sw.js
ESCAPED_TARGET="$(printf '%s' "$API_PROXY_TARGET" | sed 's/[&|]/\\&/g')"
ESCAPED_LOCAL_TARGET="$(printf '%s' "$LOCAL_API_PROXY_TARGET" | sed 's/[&|]/\\&/g')"
sed -e "s|__API_PROXY_TARGET__|${ESCAPED_TARGET}|g" -e "s|__LOCAL_API_PROXY_TARGET__|${ESCAPED_LOCAL_TARGET}|g" /usr/share/nginx/html/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
