#!/bin/sh
set -eu
VERSION="${1:-$(date +%Y%m%d%H%M%S)}"
STUDENT_NOTES="${2:-Student app update}"
ADMIN_NOTES="${3:-Admin app update}"
BASE="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
for APP in student-app admin-app; do
  ROOT="$BASE/$APP"
  if [ "$APP" = "student-app" ]; then NOTES="$STUDENT_NOTES"; else NOTES="$ADMIN_NOTES"; fi
  printf '{"version":"%s","notes":"%s"}\n' "$VERSION" "$NOTES" > "$ROOT/version.json"
  sed "s/__APP_VERSION__/$VERSION/g" "$ROOT/sw.template.js" > "$ROOT/sw.js"
  sed -i "s/APP_VERSION:'[^']*'/APP_VERSION:'$VERSION'/" "$ROOT/config.js" || true
done
echo "Static version bumped to $VERSION"
