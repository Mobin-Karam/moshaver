#!/usr/bin/env bash

set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP_DIR="$PROJECT_ROOT/mobile"
TAURI_DIR="$APP_DIR/src-tauri"
REPORT_DIR="$PROJECT_ROOT/docs/engineering/mobile"
REPORT_FILE="$REPORT_DIR/validation-latest.md"

mkdir -p "$REPORT_DIR"

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "Mobile package.json not found at: $APP_DIR"
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

  echo "Running mobile $name..."

  if (
    cd "$APP_DIR" &&
    "$@"
  ) >"$log_file" 2>&1; then
    echo "- $name: PASSED" >> "$REPORT_FILE"
  else
    echo "- $name: FAILED — see \`docs/engineering/mobile/$log_name.log\`" >> "$REPORT_FILE"
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
# Mobile Validation

- Generated: $(date --iso-8601=seconds 2>/dev/null || date)
- Application: \`mobile\`
- Package manager: \`$PM\`

## Results

EOF

run_script_if_exists "typecheck" "Type check"
run_script_if_exists "lint" "Lint"
run_script_if_exists "test" "Tests"
run_script_if_exists "build" "Web production build"

if [[ -f "$TAURI_DIR/Cargo.toml" ]]; then
  if command -v cargo >/dev/null 2>&1; then
    record_command \
      "Rust check" \
      "cargo-check" \
      cargo check --manifest-path "$TAURI_DIR/Cargo.toml"
  else
    echo "- Rust check: SKIPPED — cargo is not installed" >> "$REPORT_FILE"
  fi
else
  echo "- Rust check: SKIPPED — Cargo.toml not found" >> "$REPORT_FILE"
fi

echo >> "$REPORT_FILE"
echo "## Device Validation Still Required" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
echo "- Android back-button behavior" >> "$REPORT_FILE"
echo "- Keyboard and safe-area behavior" >> "$REPORT_FILE"
echo "- Login persistence after restart" >> "$REPORT_FILE"
echo "- App background and resume behavior" >> "$REPORT_FILE"
echo "- APK installation on a real device or emulator" >> "$REPORT_FILE"

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Mobile validation completed with $FAILURES failure(s)."
  exit 1
fi

echo "Mobile validation passed."

