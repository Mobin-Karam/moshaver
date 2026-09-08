# Moshaver v2 repository runbook

This runbook covers the active v2-only `main` and `develop` branches as inspected on 2026-09-08.

## Run the stack

From the repository root:

```bash
docker compose up --build
```

- Backend health: `http://localhost:4000/health`
- Student v2: `http://localhost:8080`
- Admin v2: `http://localhost:8081`

Use `docker compose down` to stop containers. Do not add `--volumes` unless deleting local data is intentional.

## Package development

```bash
npm --prefix backend-v2 install
npm --prefix backend-v2 run migration:run
npm --prefix backend-v2 run seed
npm --prefix backend-v2 run dev

npm --prefix admin-v2 install
npm --prefix admin-v2 run dev

npm --prefix student-app-v2 install
npm --prefix student-app-v2 run dev
```

Seed variants and their safeguards are documented in the [product demo seed guide](./backend-v2-product-demo-seed.md). Treat every printed credential as local development data.

## Verification matrix

| Change | Minimum evidence |
| --- | --- |
| Backend v2 | `lint`, tests, build, and focused API check |
| Admin v2 | tests, typecheck, lint, build, and browser verification for visible flows |
| Student v2 web | student-core build/tests, app build, and browser/mobile viewport verification |
| Tauri or Android | web checks plus the relevant native build and device/runtime check |
| Documentation | internal-link check, source-path check, and `git diff --check` |

Native checks are separate:

```bash
npm --prefix student-app-v2 run tauri:build
npm --prefix student-app-v2 run android:build
```

## Access the v1.4 archive

The full v1.4 tree is immutable history on `archive/v1.4`, pinned at `cf63c233bce116371519fef61c231143bbd902b1`. A separate worktree keeps it isolated from v2:

```bash
git fetch origin archive/v1.4
git worktree add ../moshaver-v1.4 origin/archive/v1.4
```

Run legacy instructions from that worktree. Never mix its `/api/v1` clients, SQLite data, or deployment files into the active v2 stack.

## Data and deployment safety

- Back up data before migrations and validate backups before relying on them.
- Test destructive migrations, reset seeds, and restores only against disposable databases.
- Configure exact browser origins, secure cookies, persistent storage, and real secrets for public deployment.
- Never commit `.env` files, credentials, tokens, or database files.
- Root `docker-compose.yml` is the canonical v2 topology; validate environment-specific deployment configuration before release.

Use the [feature and bug playbook](./feature-and-bug-playbook.md) for implementation and the [maintenance guide](./maintenance-guide.md) for recurring and incident work.
