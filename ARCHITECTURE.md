# Moshaver architecture

This file is the repository-level architecture entrypoint. Detailed architecture lives under `docs/architecture/`.

## Current physical layout

The current v2 applications are grouped under `apps/`:

- `apps/api/` — NestJS/Fastify API and composition root.
- `apps/admin/` — React/Vite admin application.
- `apps/student/` — React/PWA/Tauri student application.
- `student-core/` — runtime-neutral student domain/provider contracts.
- `packages/api-contract/` — shared API contracts.

Phase 5 normalized the deployable composition roots without changing their package names, service identities, or public API contracts.

## Target logical model

Moshaver follows a grouped product-monorepo model:

1. **Applications** — independently runnable/deployable composition roots.
2. **Product/domain packages** — Moshaver business capabilities.
3. **Platform packages** — reusable CMB capabilities such as auth, authorization, notifications, realtime, audit, and import/export.
4. **Kernel/contracts** — stable, low-level reusable contracts and lifecycle primitives.
5. **Infrastructure adapters** — database, cache, queue, push, storage, observability, and other vendor/runtime integrations.
6. **Tooling and operations** — generators, CI, repository automation, deployment, documentation, and Graphify.

The long-term directory shape is documented in `docs/architecture/target-monorepo-layout.md`. It is a migration target, not a requirement to move working code immediately.

## Workspace foundation

Phase 2 defines the current cross-project dependency graph in `tooling/workspace/projects.json` and repository-level commands in the root `package.json`.

The install model is intentionally `leaf-lockfiles`: existing component `package-lock.json` files remain authoritative, and the root manifest is orchestration-only. No npm `workspaces` field or unified root lockfile is introduced in this phase.

Current package-level graph:

```text
api-contract
├── apps/admin
└── student-core
    └── apps/student

cmb-kernel
├── cmb-health, cmb-realtime, cmb-identity, cmb-tenancy, cmb-system
├── cmb-notifications, cmb-activity, cmb-data-transfer
├── cmb-auth
└── cmb-authorization
    └── apps/api
```

The diagram is abbreviated; `tooling/workspace/projects.json` is the executable authority for the full graph. `apps/api` consumes CMB public entrypoints while retaining framework and product adapters.

See `docs/architecture/workspace-foundation.md` for commands, validation, TypeScript-reference decisions, adoption triggers, and rollback.

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

## Current Phase-1 classification

The source-backed module inventory is maintained under `docs/architecture/inventory/`.

Current extraction sequence:

- **W1:** health, realtime
- **W2 (implemented):** identity, tenancy, and system primitives extracted; backend persistence/adapters retained
- **W3 (implemented):** generic auth credentials, authorization evaluation, and notification state extracted; product policy/adapters retained
- **W4 (implemented):** generic activity and data-transfer mechanics extracted; education handlers retained
- **Product-owned:** education domains and cross-domain orchestration such as students, plans, exams, tasks, reports, sync, dashboard, guardian, and onboarding

This classification is evidence-based and must be revalidated when the source or Graphify graph changes.

## Frontend boundaries

- Admin and Student are separate application surfaces.
- Frontends may depend on public shared contracts and deliberately shared libraries.
- Frontends must not import backend implementation internals.
- Shared UI or feature code should be promoted into a package only after it has a real second consumer or a clear platform ownership reason.
- `student-core` remains runtime-neutral and must not depend on React, browser globals, Tauri, or concrete storage implementations.

## Architecture documents

- `docs/architecture/repository-architecture.md`
- `docs/architecture/workspace-foundation.md`
- `docs/architecture/inventory/README.md`
- `docs/architecture/inventory/backend-v2-module-inventory.md`
- `docs/architecture/inventory/backend-v2-dependency-map.md`
- `docs/architecture/inventory/project-consumers.md`
- `docs/architecture/target-monorepo-layout.md`
- `docs/architecture/dependency-boundaries.md`
- `docs/architecture/repository-architecture-migration.md`
- `docs/architecture/backend-v2-design.md`
- `docs/architecture/student-core-boundary.md`
- `docs/architecture/system-map.md`
- `docs/architecture/graphify.md`

## Change rule

Architecture changes must update the relevant ADR/document and Graphify output when the graph is available. Directory moves, package extraction, workspace conversion, or dependency-tooling changes must be separate implementation PRs with their own validation and rollback plan.
