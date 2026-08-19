#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node --check student-app/js/api.js
node --check student-app/js/app.js
node --check student-app/js/update.js
node --check student-app/sw.js
node --check admin-app/js/api.js
node --check admin-app/js/admin.js
node --check admin-app/js/update.js
node --check admin-app/sw.js
node tests/frontend-api-smoke.js
node tests/ui-contract-smoke.js
node tests/v1.4-feature-test.js
npm --prefix backend run check
npm --prefix backend run smoke
node --experimental-sqlite backend/scripts/inline-exam-test.js
printf '\nMoshaver v1.4.2 validation passed.\n'
