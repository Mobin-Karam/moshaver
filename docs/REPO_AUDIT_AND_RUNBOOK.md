<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Runbook](./REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student Core](./student-core-architecture.md) | [Tauri](./tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver Repo Audit and Runbook

Last verified: 2026-08-20

## Current Status

The production-capable stack in this repository is still the v1.4.2 stack:

- `backend/` - dependency-light Node.js 22 backend, SQLite, `/api/v1`.
- `student-app/` - static Student PWA served by Nginx or `local-server.js`.
- `admin-app/` - static Advisor/Admin console served by Nginx or `local-server.js`.

The migration stack is present but not yet the operational production stack:

- `backend-v2/` - NestJS/Fastify/TypeORM service exposing `/api/v2`.
- `admin-v2/` - Vite/React/TypeScript Admin migration target that still expects `/api/v1` in its current environment files and Vite proxy.
- `student-core/` - shared Student domain helpers; builds and tests independently.
- `student-app-v2/` - Vite/React/Tauri Student migration target; not part of root Compose.

Because Student and current Admin browser code use `/api/v1`, do not replace the production backend with `backend-v2` until endpoint parity and data migration are complete.

## Single Source of Repo Documentation

Use this file as the first runbook for the repo. Supporting documents remain useful for deeper detail:

- `../README.md` - product and v1.4.2 behavior overview.
- `reference/SECURITY.md` - auth, cookie, CSRF, and deployment security notes.
- `reference/RUNFLARE_DEPLOY.md` - Runflare deployment sequence for v1.4.2.
- `reference/JSON_IMPORT_GUIDE.md` - Admin JSON import format and planner/exam import flow.
- `migration-v1-to-v2.md` - staged v2 migration plan.
- `backend-v2-discovery.md` - backend v1 discovery notes for v2 work.
- `student-app-v1-backup-analysis.md` - Student app backup and migration analysis.

## Repository Layout

```text
backend/                 Active v1.4.2 API service.
student-app/             Active Student PWA.
admin-app/               Active Admin console.
backend-v2/              Backend v2 migration work, not production parity.
admin-v2/                Admin v2 migration work, not production deployment.
student-core/            Student v2 shared core package.
student-app-v2/          Student v2/Tauri migration work.
backup/student-app-v1/   Student v1 backup checkpoint.
backup/admin-app-legacy/ Admin legacy rollback copy.
docs/                    Audit, migration, and runbook documents.
examples/                Planner and exam JSON examples.
scripts/                 Validation, backup, and version helper scripts.
tests/                   Static/frontend/API contract smoke tests.
```

## Local Development Mode

Requirements:

- Node.js `>=22.5.0 <23`.
- No process already using ports `4000`, `8080`, or `8081`.

Start all active services:

```bash
./start-dev.sh
```

Expected URLs:

```text
Backend health: http://localhost:4000/health
Backend API:    http://localhost:4000/api/v1
Student:        http://localhost:8080
Admin:          http://localhost:8081
```

Default local credentials are created from `backend/.env.development.example` when `backend/.env` is missing:

```text
Admin:   admin / Admin123456!
Student: student / Student123456!
```

The Student and Admin local servers proxy `/api/v1` to `http://127.0.0.1:4000`, preserving same-origin cookie behavior.

## Local Production Mode on This Device

Use Docker Compose for production-mode execution on the local device:

```bash
docker compose up --build -d
```

Expected URLs:

```text
Backend health: http://localhost:4000/health
Backend API:    http://localhost:4000/api/v1
Student:        http://localhost:8080
Admin:          http://localhost:8081
```

Check status:

```bash
docker compose ps
curl -fsS http://localhost:4000/health
curl -I http://localhost:8080
curl -I http://localhost:8081
```

Stop production-mode services:

```bash
docker compose down
```

The root `docker-compose.yml` is suitable for local production-mode validation. For real public deployment, start from `docker-compose.production.example.yml`, replace all passwords and public URLs, keep `COOKIE_SECURE=1`, and keep the same-origin proxy model for Student/Admin.

## Validation Checklist

Run before deployment:

```bash
./scripts/validate-pack.sh
```

The validation script checks JavaScript syntax, frontend API contracts, auth/CSRF/logout behavior, CORS, exams, JSON import target enforcement, chat/SSE, notification behavior, sessions, and activity validation for the active v1.4.2 stack.

Useful focused checks:

```bash
cd backend && npm run check && npm run smoke
cd ../backend-v2 && npm run lint && npm test
cd ../admin-v2 && npm run build && npm test
cd ../student-core && npm run build && npm test
```

`student-app-v2` currently requires dependency installation/linking before it can build. A direct `npm run build` fails when React, Vite, Lucide, and the local `@moshaver/student-core` package are not present in `student-app-v2/node_modules`.

## Legacy and Backup Policy

Legacy code should live under `backup/` once it is not part of the active runtime path.

Current backups:

- `backup/student-app-v1/`
- `backup/admin-app-legacy/`

Active runtime folders must remain at the repository root while root Compose, validation scripts, and deployment docs reference them:

- `backend/`
- `student-app/`
- `admin-app/`

Do not move those active folders to `backup/` until the replacement stack is wired into Compose, validation, deployment docs, and smoke tests.

## Audit Findings

1. Root Compose and validation scripts target the v1.4.2 stack, not the v2 migration stack.
2. `backend-v2` exposes `/api/v2`; existing Student/Admin production clients use `/api/v1`.
3. `admin-v2` is a serious migration target, but it still depends on the `/api/v1` contract and is not wired into root Compose.
4. `admin-app-legacy` was a rollback copy and has been moved to `backup/admin-app-legacy`.
5. `student-app` already has a verified backup at `backup/student-app-v1`.
6. The safe production path today is v1.4.2 Docker Compose plus the existing same-origin proxy design.
7. `student-core` passes its current build/tests; `student-app-v2` is not yet verified runnable in this checkout.

## Next Migration Gates

Before promoting v2:

1. Add `/api/v1` compatibility or update every Student/Admin client to `/api/v2`.
2. Add a tested data migration from `backend/data/moshaver.sqlite` to the TypeORM schema.
3. Add Docker/runtime wiring for `admin-v2/dist`.
4. Update root Compose and production docs only after v2 parity tests pass.
5. Keep `backup/admin-app-legacy` and `backup/student-app-v1` until a full rollback plan is validated.
