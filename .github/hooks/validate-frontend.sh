#!/usr/bin/env bash

set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP_DIR="$PROJECT_ROOT/cloud-frontend"
REPORT_DIR="$PROJECT_ROOT/docs/engineering/frontend"
REPORT_FILE="$REPORT_DIR/validation-latest.md"

mkdir -p "$REPORT_DIR"

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "Frontend package.json not found at: $APP_DIR"
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

run_script_if_exists() {
  local script="$1"
  local display_name="$2"
  local log_file="$REPORT_DIR/${script}.log"

  if ! node -e "
    const pkg = require('$APP_DIR/package.json');
    process.exit(pkg.scripts && pkg.scripts['$script'] ? 0 : 1);
  " 2>/dev/null; then
    echo "- $display_name: SKIPPED — script not defined" >> "$REPORT_FILE"
    return
  fi

  echo "Running frontend $display_name..."

  if (
    cd "$APP_DIR" &&
    "$PM" run "$script"
  ) >"$log_file" 2>&1; then
    echo "- $display_name: PASSED" >> "$REPORT_FILE"
  else
    echo "- $display_name: FAILED — see \`docs/engineering/frontend/${script}.log\`" >> "$REPORT_FILE"
    FAILURES=$((FAILURES + 1))
  fi
}

cat > "$REPORT_FILE" <<EOF
# Frontend Validation

- Generated: $(date --iso-8601=seconds 2>/dev/null || date)
- Application: \`cloud-frontend\`
- Package manager: \`$PM\`

## Results

EOF

run_script_if_exists "typecheck" "Type check"
run_script_if_exists "lint" "Lint"
run_script_if_exists "test" "Tests"
run_script_if_exists "build" "Production build"

echo >> "$REPORT_FILE"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Frontend validation completed with $FAILURES failure(s)."
  exit 1
fi

echo "Frontend validation passed."
