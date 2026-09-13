# Target monorepo layout

This document describes the **long-term target**. It does not authorize moving current source directories in this architecture-only change.

## Recommended shape

```text
moshaver/
├── apps/
│   ├── api/                       # deployable NestJS/Fastify composition root
│   ├── admin/                     # deployable React admin application
│   └── student/                   # deployable React/PWA/Tauri student application
│
├── packages/
│   ├── contracts/
│   │   ├── api/                   # transport-neutral shared API schemas/types
│   │   └── events/                # cross-module event contracts when needed
│   │
│   ├── cmb/
│   │   ├── kernel/                # lifecycle/config/errors/module registry contracts
│   │   ├── security/              # auth/session/authorization primitives
│   │   ├── persistence/           # persistence ports and shared primitives
│   │   ├── notifications/         # durable notification capability
│   │   ├── realtime/              # realtime/event delivery capability
│   │   ├── audit/                 # audit/activity primitives
│   │   └── import-export/         # reusable import/export framework
│   │
│   ├── adapters/
│   │   ├── database-typeorm/      # TypeORM adapter/implementation
│   │   ├── database-sqlite/       # SQLite-specific integration where needed
│   │   ├── push-web/              # Web Push provider
│   │   ├── storage-*/             # file/object storage implementations
│   │   └── observability-*/       # logging/metrics/tracing implementations
│   │
│   ├── product/
│   │   ├── student-core/          # runtime-neutral student logic/contracts
│   │   ├── students/              # Moshaver student backend domain
│   │   ├── plans/
│   │   ├── exams/
│   │   ├── reports/
│   │   ├── guardian/
│   │   └── ...                    # other Moshaver-only domains
│   │
│   ├── ui/
│   │   ├── primitives/            # only if genuinely shared by >1 UI surface
│   │   └── tokens/                # shared design tokens if ownership is cross-app
│   │
│   └── testing/
│       ├── fixtures/
│       └── helpers/
│
├── tooling/
│   ├── generators/                # CMB/project/module scaffolding
│   ├── scripts/                   # repo-level maintenance scripts
│   ├── config/                    # shared lint/TS/test configs when worth extracting
│   └── architecture/              # boundary validation tooling
│
├── infra/
│   ├── docker/                    # optional future home for deployment/container assets
│   ├── deploy/
│   └── observability/
│
├── examples/
│   └── cmb-reference/             # non-education proof of reusable CMB architecture
│
├── docs/
│   ├── architecture/
│   ├── components/
│   ├── operations/
│   ├── migrations/
│   ├── product/
│   ├── releases/
│   └── history/
│
├── .github/
├── .agents/
├── graphify-out/
├── ARCHITECTURE.md
├── AGENTS.md
└── README.md
```

## Why `apps/`

`apps/` means "runnable/deployable composition root". An app may depend on packages, but packages must never depend on an app.

This makes deployment ownership obvious and lets CI reason about affected deployables.

## Why grouped `packages/`

A flat package directory becomes difficult to scan once CMB and product extraction expands. Grouping communicates both **scope** and **role**:

- `contracts/` — stable shared boundaries;
- `cmb/` — reusable backend platform;
- `adapters/` — concrete runtime/vendor implementations;
- `product/` — Moshaver-specific domain packages;
- `ui/` — truly cross-app UI libraries;
- `testing/` — intentionally reusable test infrastructure.

## Why not make everything shared

Shared code has the broadest blast radius. Promotion into a common package should happen only when:

- at least two real consumers exist; or
- the package is intentionally a platform/foundation contract; or
- architectural ownership clearly belongs outside either application.

Code used by only Admin should usually stay in Admin. Code used only by Student should usually stay in Student.

## Naming

Package names should expose ownership and role. Examples:

- `@moshaver/api-contract`
- `@moshaver/student-core`
- `@moshaver/cmb-kernel`
- `@moshaver/cmb-security`
- `@moshaver/cmb-notifications`
- `@moshaver/adapter-typeorm`
- `@moshaver/product-exams`

Names are illustrative until packages are actually extracted.
