#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh"; fi
if command -v nvm >/dev/null 2>&1; then nvm use 22.12.0 >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1 || true; fi
MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$MAJOR" -lt 22 ]; then echo "Node 22+ required. Current: $(node -v 2>/dev/null || echo missing)"; exit 1; fi
if [ ! -f "$ROOT/backend/.env" ]; then cp "$ROOT/backend/.env.development.example" "$ROOT/backend/.env"; fi
mkdir -p "$ROOT/backend/data"
cleanup(){ echo; echo "Stopping..."; kill ${BPID:-} ${SPID:-} ${APID:-} 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$ROOT/backend" && npm run dev:watch) & BPID=$!
(cd "$ROOT/student-app" && node local-server.js --local-api --port=8080) & SPID=$!
(cd "$ROOT/admin-app" && node local-server.js --local-api --port=8081) & APID=$!
sleep 1
echo "Student: http://localhost:8080  (same-origin /api/v1 proxy)"
echo "Admin:   http://localhost:8081  (same-origin /api/v1 proxy)"
echo "API:     http://localhost:4000/api/v1"
echo "Health:  http://localhost:4000/health"
echo "Node:    $(node -v)"
echo "Ctrl+C stops all services."
wait
