#!/usr/bin/env bash

set -u

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUTPUT_FILE="${1:-$PROJECT_ROOT/docs/ai-context/project-detection.md}"

mkdir -p "$(dirname "$OUTPUT_FILE")"

detect_package_manager() {
  if [[ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "$PROJECT_ROOT/yarn.lock" ]]; then
    echo "yarn"
  elif [[ -f "$PROJECT_ROOT/package-lock.json" ]]; then
    echo "npm"
  elif [[ -f "$PROJECT_ROOT/bun.lockb" || -f "$PROJECT_ROOT/bun.lock" ]]; then
    echo "bun"
  else
    echo "UNKNOWN"
  fi
}

PACKAGE_MANAGER="$(detect_package_manager)"

cat > "$OUTPUT_FILE" <<EOF
# Project Detection

Generated automatically by the engineering session hook.

## Repository

- Root: \`$PROJECT_ROOT\`
- Package manager: \`$PACKAGE_MANAGER\`
- Generated at: \`$(date --iso-8601=seconds 2>/dev/null || date)\`

## Detected Applications

EOF

detect_node_application() {
  local directory="$1"
  local label="$2"

  if [[ ! -f "$directory/package.json" ]]; then
    return
  fi

  {
    echo "### $label"
    echo
    echo "- Path: \`${directory#"$PROJECT_ROOT"/}\`"
    echo "- Package file: \`${directory#"$PROJECT_ROOT"/}/package.json\`"

    if grep -q '"next"' "$directory/package.json"; then
      echo "- Next.js detected"
    fi

    if grep -q '"react"' "$directory/package.json"; then
      echo "- React detected"
    fi

    if grep -q '"@nestjs/' "$directory/package.json"; then
      echo "- NestJS detected"
    fi

    if grep -q '"@tauri-apps/' "$directory/package.json"; then
      echo "- Tauri detected"
    fi

    if grep -q '"@prisma/client"' "$directory/package.json"; then
      echo "- Prisma client detected"
    fi

    if grep -q '"@tanstack/react-query"' "$directory/package.json"; then
      echo "- TanStack React Query detected"
    fi

    echo
  } >> "$OUTPUT_FILE"
}

detect_node_application "$PROJECT_ROOT/cloud-frontend" "Frontend"
detect_node_application "$PROJECT_ROOT/cloud-api" "Backend"
detect_node_application "$PROJECT_ROOT/mobile" "Mobile"

{
  echo "## Database and Infrastructure"
  echo

  if [[ -f "$PROJECT_ROOT/cloud-api/prisma/schema.prisma" ]]; then
    echo "- Prisma schema: \`cloud-api/prisma/schema.prisma\`"
  elif [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
    echo "- Prisma schema: \`prisma/schema.prisma\`"
  else
    echo "- Prisma schema: UNKNOWN"
  fi

  if find "$PROJECT_ROOT" -maxdepth 2 \
      \( -name 'docker-compose.yml' \
      -o -name 'docker-compose.yaml' \
      -o -name 'docker-compose.*.yml' \
      -o -name 'docker-compose.*.yaml' \) \
      -print -quit 2>/dev/null | grep -q .; then
    echo "- Docker Compose configuration detected"
  fi

  if [[ -d "$PROJECT_ROOT/.github/workflows" ]]; then
    echo "- GitHub Actions workflows detected"
  fi

  if [[ -f "$PROJECT_ROOT/pnpm-workspace.yaml" ]]; then
    echo "- pnpm workspace detected"
  fi

  echo
  echo "## Git State"
  echo
  echo '```text'
  git -C "$PROJECT_ROOT" status --short 2>/dev/null || echo "Git status unavailable"
  echo '```'
} >> "$OUTPUT_FILE"

echo "$PROJECT_ROOT"
