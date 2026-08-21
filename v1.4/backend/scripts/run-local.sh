#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -f .env ]; then
  cp .env.development.example .env
  echo "Created .env from .env.development.example"
fi
mkdir -p data
exec node --experimental-sqlite --watch src/server.js
