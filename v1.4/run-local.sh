#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"
STARTED_PIDS=""

is_up() { curl -fsS --max-time 2 "$1" >/dev/null 2>&1; }
remember() { STARTED_PIDS="$STARTED_PIDS $1"; }
stop_started() {
  trap - INT TERM EXIT
  printf '\nStopping Moshaver services started by this launcher...\n'
  for pid in $STARTED_PIDS; do kill "$pid" 2>/dev/null || true; done
  for pid in $STARTED_PIDS; do wait "$pid" 2>/dev/null || true; done
}
trap stop_started INT TERM EXIT

printf 'Preparing the date-relative seven-day demo plan...\n'
(cd "$ROOT_DIR/backend" && npm run seed:demo-week) >>"$RUN_DIR/seed.log" 2>&1

if is_up http://127.0.0.1:4000/ready; then
  printf '✓ Backend already running: http://localhost:4000\n'
else
  (cd "$ROOT_DIR/backend" && npm run dev) >>"$RUN_DIR/backend.log" 2>&1 &
  remember "$!"
  attempt=0
  while ! is_up http://127.0.0.1:4000/ready; do
    attempt=$((attempt + 1)); [ "$attempt" -lt 40 ] || { printf 'Backend failed; see %s\n' "$RUN_DIR/backend.log"; exit 1; }; sleep 0.25
  done
  printf '✓ Backend started: http://localhost:4000\n'
fi

if is_up http://127.0.0.1:8080/; then
  printf '✓ Student app already running: http://localhost:8080\n'
else
  (cd "$ROOT_DIR/student-app" && node local-server.js --local-api --port=8080) >>"$RUN_DIR/student.log" 2>&1 &
  remember "$!"
  attempt=0
  while ! is_up http://127.0.0.1:8080/; do
    attempt=$((attempt + 1)); [ "$attempt" -lt 40 ] || { printf 'Student app failed; see %s\n' "$RUN_DIR/student.log"; exit 1; }; sleep 0.25
  done
  printf '✓ Student app started: http://localhost:8080\n'
fi

if is_up http://127.0.0.1:8081/; then
  printf '✓ Admin app already running: http://localhost:8081\n'
else
  (cd "$ROOT_DIR/admin-app" && node local-server.js --local-api --port=8081) >>"$RUN_DIR/admin.log" 2>&1 &
  remember "$!"
  attempt=0
  while ! is_up http://127.0.0.1:8081/; do
    attempt=$((attempt + 1)); [ "$attempt" -lt 40 ] || { printf 'Admin app failed; see %s\n' "$RUN_DIR/admin.log"; exit 1; }; sleep 0.25
  done
  printf '✓ Admin app started: http://localhost:8081\n'
fi

printf '\nMoshaver v1.4 is ready. Press Ctrl+C to stop services started here.\n'
printf 'Logs: %s\n' "$RUN_DIR"
while :; do sleep 5; done
