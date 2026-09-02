# Moshaver repository runbook

This runbook describes the repository as inspected on 2026-09-02. Start with the [system map](../architecture/system-map.md) if the two product generations are unfamiliar.

## Choose the generation first

| Goal | Working directory | API | Primary command |
| --- | --- | --- | --- |
| Run the root v2 web stack | repository root | `/api/v2` | `docker compose up --build` |
| Develop backend v2 | `backend-v2/` | `/api/v2` | `npm run dev` |
| Develop Admin v2 | `admin-v2/` | `/api/v2` | `npm run dev` |
| Develop Student v2 | `student-app-v2/` | `/api/v2` | `npm run dev` |
| Validate Student core | `student-core/` | none | `npm run build && npm test` |
| Run the v1.4 product line | `v1.4/` | `/api/v1` | `./run-local.sh` |

Do not mix v1 and v2 databases, API bases, or frontend builds.

## Root v2 stack

Requirements: Docker with Compose. From the repository root:

```bash
docker compose up --build
```

Expected endpoints:

- backend health: `http://localhost:4000/health`
- Student v2: `http://localhost:8080`
- Admin v2: `http://localhost:8081`

Useful checks:

```bash
docker compose ps
curl -fsS http://localhost:4000/health
curl -fsSI http://localhost:8080
curl -fsSI http://localhost:8081
```

Stop the stack with `docker compose down`. The persistent v2 SQLite data is in the named Compose volume; do not remove volumes unless data deletion is explicitly intended.

## Direct v2 development and validation

Install dependencies in each package before the first run. Relevant checks are:

```bash
npm --prefix backend-v2 run lint
npm --prefix backend-v2 test
npm --prefix backend-v2 run build
npm --prefix admin-v2 test
npm --prefix admin-v2 run build
npm --prefix student-core run build
npm --prefix student-core test
npm --prefix student-app-v2 run build
```

Native Tauri/Android validation is separate from the web build:

```bash
npm --prefix student-app-v2 run tauri:build
npm --prefix student-app-v2 run android:build
```

Only report native readiness when those native commands were actually run successfully on a configured machine.

## v1.4 local product line

The complete legacy line now lives under `v1.4/`:

```bash
cd v1.4
./run-local.sh
```

Backend verification is run from `v1.4/backend`:

```bash
npm run check
npm run smoke
npm run test:learning-api
npm run test:backup
npm run test:chat-groups
npm run test:chat-markdown
```

The backend requires Node 22 and uses `--experimental-sqlite`. Backup/restore tests must use a temporary database. Do not perform an active production restore as routine verification.

## Known root helper mismatch

`start-dev.sh` and `scripts/validate-pack.sh` still reference the former root paths `backend/`, `student-app/`, and `admin-app/`. Those paths are now under `v1.4/`, so these helpers are historical until rewired. Use `v1.4/run-local.sh` and package-local validation commands instead.

This warning is intentional: documentation should not claim that a command is usable when its referenced directories are absent.

## Deployment entry points

- Root `docker-compose.yml`: v2 local/container stack.
- `docker-compose.dual-api.yml` and `deploy/dual-api/`: transition topology where both API generations are required.
- `docker-compose.production.example.yml`: inspect carefully before use; its paths and secrets must match the intended generation.
- [v1.4 Runflare deployment](./runflare-v1-4-deployment.md): canonical v1.4 deployment guide.

For public deployment, set exact browser origins, secure cookie settings, persistent storage, and production secrets. Never copy example credentials into production.

## Change verification matrix

| Change | Minimum evidence |
| --- | --- |
| Backend v2 | lint/typecheck, unit tests, build, and focused API check |
| Admin v2 | tests, build, and browser verification for visible flows |
| Student v2 web | core tests, web build, and browser/mobile viewport verification |
| Tauri/native | web checks plus the relevant native build and device/runtime check |
| v1.4 backend | `npm run check`, focused tests, and `npm run smoke` when behavior changes |
| v1.4 static UI | syntax/shared-asset checks plus browser verification |
| Docs | internal link check and source-path check |

## Data safety

- Snapshot a database before migration or restore.
- Validate uploaded SQLite databases before atomic replacement.
- Run destructive migration/restore tests against a temporary database only.
- Preserve `backup/` until the replacement generation has a verified rollback path.
- Never commit `.env` secrets or database files.
