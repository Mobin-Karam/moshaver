#!/usr/bin/env bash

set -u

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT" || exit 1

echo "========================================"
echo " Engineering Session Preparation"
echo "========================================"
echo "Project: $PROJECT_ROOT"
echo

mkdir -p docs/engineering
mkdir -p docs/engineering/frontend
mkdir -p docs/engineering/backend
mkdir -p docs/engineering/mobile
mkdir -p docs/engineering/security
mkdir -p docs/engineering/api-contracts
mkdir -p docs/ai-context
mkdir -p .agent-state

DISCOVERY_FILE="$PROJECT_ROOT/docs/ai-context/project-detection.md"

bash "$PROJECT_ROOT/.github/hooks/detect-project.sh" "$DISCOVERY_FILE" >/dev/null

SESSION_FILE="$PROJECT_ROOT/.agent-state/current-session.md"

cat > "$SESSION_FILE" <<EOF
# Current Engineering Session

- Started: $(date --iso-8601=seconds 2>/dev/null || date)
- Repository: $PROJECT_ROOT
- Branch: $(git branch --show-current 2>/dev/null || echo UNKNOWN)
- Commit: $(git rev-parse --short HEAD 2>/dev/null || echo UNKNOWN)

## Required Workflow

1. Read project instructions.
2. Inspect existing implementation before editing.
3. Trace API contracts before changing clients.
4. Preserve tenant isolation and authorization.
5. Make the smallest complete change.
6. Run relevant validation before completion.
7. Report failed checks honestly.

## Application Paths

- Frontend: cloud-frontend
- Backend: cloud-api
- Mobile: mobile

Verify these paths before relying on them.
EOF

echo "Created documentation folders."
echo "Updated: docs/ai-context/project-detection.md"
echo "Created: .agent-state/current-session.md"
echo

echo "Detected applications:"

for app in cloud-frontend cloud-api mobile; do
  if [[ -d "$PROJECT_ROOT/$app" ]]; then
    echo "  ✓ $app"
  else
    echo "  - $app not found"
  fi
done

echo
echo "Git status:"
git status --short 2>/dev/null || true

echo
echo "Engineering session preparation completed."
