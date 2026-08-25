#!/bin/sh
set -eu
cd "$(dirname "$0")"
find . -type f -name '*.js' -not -path './node_modules/*' -print | sort | while IFS= read -r file; do
  node --check "$file" >/dev/null
  printf 'PASS %s\n' "$file"
done
node scripts/validate-static.js
node scripts/build-css.mjs --check
