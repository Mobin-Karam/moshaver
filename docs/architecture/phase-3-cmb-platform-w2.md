# Phase 3 — CMB platform W2

## Status

W2 is implemented. The extraction preserves the existing `/api/v2` controllers, DTOs, response shapes, persistence entities, and migrations.

## Extracted boundaries

### `@moshaver/cmb-identity`

Owns framework-neutral identity values: username normalization, stable string-set normalization, and capability projection. The API adapter keeps bcrypt, TypeORM repositories, sessions, role records, and product chat enrollment.

### `@moshaver/cmb-tenancy`

Owns generic organization scope and platform-role assignment decisions. The API adapter maps denied decisions to the existing error codes and keeps organization/member persistence and Moshaver chat membership side effects.

### `@moshaver/cmb-system`

Owns application-version validation and persistence-neutral audit projection. The API adapter keeps TypeORM, SQLite health inspection, backup/restore, filesystem operations, environment policy, and audit persistence.

## Dependency shape

```text
backend-v2 adapters
    ├── cmb-identity ──┐
    ├── cmb-tenancy ──┼──> cmb-kernel
    └── cmb-system ───┘
```

The packages expose public entrypoints, have standalone Node tests, and do not import NestJS, TypeORM, Moshaver product code, or application code.

## Compatibility boundary

No route, DTO, database schema, migration, authentication/session flow, organization membership rule, or backup/restore behavior is intentionally changed. Persian transport errors remain in `apps/api`.

## Next wave

W3 can build on identity and tenancy contracts to decouple auth, authorization, and notification delivery from `Student` and product relationship persistence. Only reusable mechanisms should move; product recipient and resource policy stays in Moshaver.
