<!-- DOCS_NAV_START -->
[Docs Home](../../README.md) | [Runbook](../../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../../student-app-v2-gap-analysis.md) | [Student Core](../../student-core-architecture.md) | [Tauri](../../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Backend v2 Test Report

Last updated: 2026-08-20

## Checks Run

- `npm install`: passed, then dependencies upgraded to zero audit findings.
- `npm run build`: passed.
- `npm test`: passed.
- `npm audit --omit=dev --audit-level=high`: passed, 0 vulnerabilities.
- Runtime smoke with SQLite migrations on port `4011`: passed.
- `GET /health`: passed.
- `GET /ready`: passed.
- `POST /api/v2/auth/login`: passed.
- `GET /api/v2/auth/me`: passed.
- Admin role endpoint `GET /api/v2/admin/students`: passed.
- CSRF rejection without `X-CSRF-Token`: passed.
- CSRF acceptance with `X-CSRF-Token`: passed.
- `GET /api/v2/sync`: passed.
- `GET /api/v2/events`: passed.

## Pending

- Docker build was retried after optimizing the Dockerfile to avoid a second network install.
- `docker compose up` should be run after the Docker image build passes.
