# Moshaver architecture

This file is the repository-level architecture entrypoint. Detailed architecture lives under `docs/architecture/`.

## Current physical layout

The current v2 applications remain in place:

- `backend-v2/` — NestJS/Fastify API and composition root.
- `admin-v2/` — React/Vite admin application.
- `student-app-v2/` — React/PWA/Tauri student application.
- `student-core/` — runtime-neutral student domain/provider contracts.
- `packages/api-contract/` — shared API contracts.

No source movement is required to follow the architecture rules below.

## Target logical model

Moshaver follows a grouped product-monorepo model:

1. **Applications** — independently runnable/deployable composition roots.
2. **Product/domain packages** — Moshaver business capabilities.
3. **Platform packages** — reusable CMB capabilities such as auth, authorization, notifications, realtime, audit, and import/export.
4. **Kernel/contracts** — stable, low-level reusable contracts and lifecycle primitives.
5. **Infrastructure adapters** — database, cache, queue, push, storage, observability, and other vendor/runtime integrations.
6. **Tooling and operations** — generators, CI, repository automation, deployment, documentation, and Graphify.

The long-term directory shape is documented in `docs/architecture/target-monorepo-layout.md`. It is a migration target, not a requirement to move working code immediately.

## Backend style

The backend is a **modular monolith first**, built around CMB — Composable Modular Backend Architecture. It should remain one deployable API until there is a concrete operational reason to extract a service.

The composition direction is:

```text
apps/api composition root
        ↓
Moshaver product modules
        ↓
CMB platform modules
        ↓
CMB kernel + public contracts
        ↓
infrastructure adapters
```

Dependencies may point downward only. Product concepts must never leak into the reusable kernel.

## Frontend boundaries

- Admin and Student are separate application surfaces.
- Frontends may depend on public shared contracts and deliberately shared libraries.
- Frontends must not import backend implementation internals.
- Shared UI or feature code should be promoted into a package only after it has a real second consumer or a clear platform ownership reason.
- `student-core` remains runtime-neutral and must not depend on React, browser globals, Tauri, or concrete storage implementations.

## Architecture documents

- `docs/architecture/repository-architecture.md`
- `docs/architecture/target-monorepo-layout.md`
- `docs/architecture/dependency-boundaries.md`
- `docs/architecture/repository-architecture-migration.md`
- `docs/architecture/backend-v2-design.md`
- `docs/architecture/student-core-boundary.md`
- `docs/architecture/system-map.md`
- `docs/architecture/graphify.md`

## Change rule

Architecture changes must update the relevant ADR/document and Graphify output when the graph is available. Directory moves, package extraction, workspace conversion, or dependency-tooling changes must be separate implementation PRs with their own validation and rollback plan.
