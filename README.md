# Moshaver v2

Moshaver is a role-aware education platform with separate Admin and Student applications backed by a NestJS `/api/v2` service. The `main` and `develop` branches contain the active v2 product line only.

## Architecture

Moshaver uses a **grouped product-monorepo** model with a **modular-monolith backend**. Current source paths remain unchanged while architecture boundaries are adopted incrementally.

- Repository architecture entrypoint: [ARCHITECTURE.md](ARCHITECTURE.md)
- Detailed architecture: [docs/architecture/repository-architecture.md](docs/architecture/repository-architecture.md)
- Target long-term layout: [docs/architecture/target-monorepo-layout.md](docs/architecture/target-monorepo-layout.md)
- Dependency rules: [docs/architecture/dependency-boundaries.md](docs/architecture/dependency-boundaries.md)
- Migration plan: [docs/architecture/repository-architecture-migration.md](docs/architecture/repository-architecture-migration.md)

The backend's reusable architecture direction is **CMB — Composable Modular Backend Architecture**. The current backend remains the API composition root; reusable CMB capabilities are extracted incrementally rather than through a rewrite.

## Applications

| Package | Purpose | Local port |
| --- | --- | --- |
| `apps/api/` | NestJS/Fastify API, TypeORM persistence, auth, RBAC, and product modules | 4000 |
| `apps/admin/` | React administration platform | 8081 |
| `apps/student/` | React/PWA/Tauri student application | 8080 |
| `student-core/` | Runtime-neutral student domain and provider contracts | none |

## Start the v2 stack

```bash
docker compose up --build
```

Open Student at `http://localhost:8080`, Admin at `http://localhost:8081`, and backend health at `http://localhost:4000/health`.

For package-level development, migrations, role-aware seed accounts, verification commands, and data-safety guidance, use the [repository runbook](docs/operations/repository-runbook.md). The [documentation index](docs/README.md) routes architecture, API, maintenance, and feature-development topics.

## Legacy v1.4 archive

The complete v1.4 source and its historical operational documentation are preserved on the permanent `archive/v1.4` branch at commit `cf63c233bce116371519fef61c231143bbd902b1`. It is intentionally absent from `main` and `develop`.

Use a separate worktree to inspect or run it without replacing a v2 checkout:

```bash
git fetch origin archive/v1.4
git worktree add ../moshaver-v1.4 origin/archive/v1.4
```

Do not point v1 clients at `/api/v2`, reuse a v1 database as a v2 database, or copy development seed credentials into production.

## Validation

```bash
npm --prefix apps/api run lint
npm --prefix apps/api test
npm --prefix apps/api run build
npm --prefix apps/admin test
npm --prefix apps/admin run typecheck
npm --prefix apps/admin run build
npm --prefix student-core run build
npm --prefix student-core test
npm --prefix apps/student run build
```

Browser, Tauri, Android, and deployed-environment checks are separate release gates.
