# Repository architecture

Status: **accepted target architecture; current source layout remains valid during migration**.

## Why this architecture

Moshaver is no longer a single application. It contains multiple independently runnable surfaces, shared contracts, a runtime-neutral student core, a reusable-backend initiative (CMB), deployment tooling, and AI/repository automation.

The repository therefore needs explicit project boundaries rather than a collection of top-level folders.

The selected model combines patterns proven by mature TypeScript monorepos:

- runnable/deployable applications are distinct from reusable libraries;
- dependencies between projects are explicit and queryable;
- reusable code is promoted deliberately rather than becoming a global `shared` dumping ground;
- applications are thin composition roots;
- architecture rules can be enforced by project/dependency graphs;
- backend modules remain modular and independently testable before any microservice split.

## Architecture style

### Repository: grouped product monorepo

The repository contains several project classes:

| Class | Responsibility | Current examples |
| --- | --- | --- |
| Application | Runnable/deployable composition root | `apps/api`, `apps/admin`, `apps/student` |
| Product/domain package | Product behavior that belongs to Moshaver | future extracted exam/plan/report packages; current backend modules |
| Platform package | Reusable application/platform capability | future CMB auth, authorization, notifications, realtime, audit |
| Foundation package | Stable contracts/kernel with minimal dependencies | `packages/api-contract`, future CMB kernel |
| Runtime-neutral domain | Domain logic intentionally separated from UI/runtime | `student-core` |
| Infrastructure adapter | Vendor/runtime integration | current TypeORM/SQLite, Web Push, Tauri storage adapters; future extracted adapters |
| Tooling | Repository/build/test/generator automation | `.github`, `.agents`, AI toolkit, future `tooling/` |
| Documentation | Current architecture, operations and history | `docs/` |

### Backend: modular monolith first

The backend should stay one deployable service while internal modules become better isolated.

Service extraction is justified only by measurable needs such as:

- independent scaling requirements;
- materially different availability/SLO requirements;
- regulatory/security isolation;
- a separate team/release lifecycle that cannot be handled in the monorepo;
- a workload that benefits from a distinct runtime or resource model.

A module is **not** turned into a microservice only because it is large.

## Core design rules

1. **Applications compose; packages implement.** Application roots wire configuration, transport, providers, modules, and lifecycle.
2. **Dependencies point inward/downward.** Product code may depend on platform/foundation contracts. Foundation code may not depend on product code.
3. **Public entrypoints only.** Cross-project imports use declared public APIs rather than another project's private files.
4. **One owner per capability.** Data schema, migrations, API contracts, events, and permissions have a clear owning module/package.
5. **No global shared dumping ground.** Code becomes shared only when its ownership and consumer set are known.
6. **Contracts are stable boundaries.** HTTP DTOs, event schemas, public service interfaces, and shared types are versioned/reviewed surfaces.
7. **Runtime-neutral code stays neutral.** Domain packages should avoid framework/browser/native dependencies unless that is their explicit role.
8. **Architecture is executable.** Graphify/project-graph analysis and CI should eventually detect forbidden dependency directions.

## Recommended ownership zones

```text
application composition roots
        │
        ├───────────────┐
        ↓               ↓
product modules     frontend features
        │               │
        ↓               ↓
platform modules   shared public contracts
        │               │
        └───────┬───────┘
                ↓
        foundation/kernel
                │
                ↓
       adapter contracts/ports
                ↑
       infrastructure adapters
```

Infrastructure adapters implement ports owned by the lower-level architecture; they do not become the place where business decisions live.

## Technology-tooling direction

The folder model is intentionally compatible with npm/pnpm/yarn workspaces, Turborepo, and Nx. No workspace tool is mandated by this architecture document.

If Moshaver later adopts a monorepo task orchestrator, choose it based on concrete needs:

- choose **Nx** when enforceable project boundaries, affected graphs, generators, and rich project metadata are the primary need;
- choose **Turborepo** when the primary need is lightweight task orchestration/caching around an already clean workspace model;
- use native package-manager workspaces and TypeScript project references where they are sufficient.

The architectural boundaries are more important than the orchestration tool.

## Current-to-target mapping

| Current path | Logical role now | Long-term target |
| --- | --- | --- |
| `apps/api/` | API application + many internal modules | `apps/api/` composition root plus extracted packages over time |
| `apps/admin/` | Admin application | `apps/admin/` |
| `apps/student/` | Student application | `apps/student/` |
| `student-core/` | Runtime-neutral student package | `packages/product/student-core/` or equivalent |
| `packages/api-contract/` | Shared foundation contract | `packages/contracts/api/` or keep current name if migration cost is not justified |
| `.github/`, `.agents/` | repository/AI tooling | remain repository-level |
| `docs/` | documentation | remain repository-level |
| `docker-compose.yml` | local stack orchestration | eventually `infra/` only if the operational benefit outweighs churn |

Physical relocation is deliberately deferred. The logical role is effective immediately.
