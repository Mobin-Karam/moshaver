#!/usr/bin/env bash

set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP_DIR="$PROJECT_ROOT/cloud-api"
REPORT_DIR="$PROJECT_ROOT/docs/engineering/backend"
REPORT_FILE="$REPORT_DIR/validation-latest.md"

mkdir -p "$REPORT_DIR"

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "Backend package.json not found at: $APP_DIR"
  exit 0
fi

detect_package_manager() {
  if [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "$APP_DIR/yarn.lock" || -f "$PROJECT_ROOT/yarn.lock" ]]; then
    echo "yarn"
  elif [[ -f "$APP_DIR/package-lock.json" || -f "$PROJECT_ROOT/package-lock.json" ]]; then
    echo "npm"
  else
    echo "npm"
  fi
}

PM="$(detect_package_manager)"
FAILURES=0

record_command() {
  local name="$1"
  local log_name="$2"
  shift 2

  local log_file="$REPORT_DIR/$log_name.log"

  echo "Running backend $name..."

  if (
    cd "$APP_DIR" &&
    "$@"
  ) >"$log_file" 2>&1; then
    echo "- $name: PASSED" >> "$REPORT_FILE"
  else
    echo "- $name: FAILED — see \`docs/engineering/backend/$log_name.log\`" >> "$REPORT_FILE"
    FAILURES=$((FAILURES + 1))
  fi
}

run_script_if_exists() {
  local script="$1"
  local display_name="$2"

  if ! node -e "
    const pkg = require('$APP_DIR/package.json');
    process.exit(pkg.scripts && pkg.scripts['$script'] ? 0 : 1);
  " 2>/dev/null; then
    echo "- $display_name: SKIPPED — script not defined" >> "$REPORT_FILE"
    return
  fi

  record_command "$display_name" "$script" "$PM" run "$script"
}

cat > "$REPORT_FILE" <<EOF
# Backend Validation

- Generated: $(date --iso-8601=seconds 2>/dev/null || date)
- Application: \`cloud-api\`
- Package manager: \`$PM\`

## Results

EOF

if [[ -f "$APP_DIR/prisma/schema.prisma" ]]; then
  record_command \
    "Prisma format check" \
    "prisma-format" \
    "$PM" exec prisma format --check

  record_command \
    "Prisma validation" \
    "prisma-validate" \
    "$PM" exec prisma validate
else
  echo "- Prisma validation: SKIPPED — schema not found" >> "$REPORT_FILE"
fi

run_script_if_exists "typecheck" "Type check"
run_script_if_exists "lint" "Lint"
run_script_if_exists "test" "Unit tests"
run_script_if_exists "test:e2e" "End-to-end tests"
run_script_if_exists "build" "Production build"

echo >> "$REPORT_FILE"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Backend validation completed with $FAILURES failure(s)."
  exit 1
fi

echo "Backend validation passed."

