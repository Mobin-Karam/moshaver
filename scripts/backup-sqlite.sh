#!/usr/bin/env bash
set -euo pipefail
DB="${1:-./backend/data/moshaver.sqlite}"
OUT="${2:-./backups}"
mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE="$OUT/moshaver-$STAMP.sqlite"
cp "$DB" "$BASE"
if [ -f "$DB-wal" ]; then cp "$DB-wal" "$BASE-wal"; fi
if [ -f "$DB-shm" ]; then cp "$DB-shm" "$BASE-shm"; fi
echo "$BASE"
