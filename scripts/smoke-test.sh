#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:4000/api/v1}"
STUDENT_PASSWORD="${STUDENT_PASSWORD:-Student123456!}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123456!}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Health..."
curl -fsS "$BASE/health" >/dev/null

echo "Student cookie login..."
curl -fsS -c "$TMP/student.cookies" -X POST "$BASE/auth/login" \
  -H 'Origin: http://localhost:8080' -H 'Content-Type: application/json' \
  -d "{\"username\":\"student\",\"password\":\"$STUDENT_PASSWORD\"}" > "$TMP/student.json"
python3 - "$TMP/student.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); assert d['ok'] and d['data']['csrfToken']
PY
curl -fsS -b "$TMP/student.cookies" -H 'Origin: http://localhost:8080' "$BASE/dashboard" >/dev/null

echo "Admin cookie login..."
curl -fsS -c "$TMP/admin.cookies" -X POST "$BASE/auth/login" \
  -H 'Origin: http://localhost:8081' -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}" > "$TMP/admin.json"
python3 - "$TMP/admin.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); assert d['ok'] and d['data']['csrfToken']
PY
curl -fsS -b "$TMP/admin.cookies" -H 'Origin: http://localhost:8081' "$BASE/admin/dashboard" >/dev/null

echo "Smoke test passed."
