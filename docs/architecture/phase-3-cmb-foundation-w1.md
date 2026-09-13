# Phase 3 — CMB foundation and W1 extraction

## Status

Phase 3 is **in progress**. This slice implements the contract authority decision, CMB kernel foundation, and W1 extraction proof for `health` and `realtime`.

## Extracted packages

### `@moshaver/cmb-kernel`

Provides runtime-neutral module metadata primitives:

- validated module descriptors;
- stable CMB module kinds;
- globally stable token creation.

It has no NestJS, TypeORM, React, RxJS, browser, or Moshaver product dependency.

### `@moshaver/cmb-health`

Provides a framework-neutral liveness/readiness service:

- stable liveness payload;
- named readiness probes;
- probe-specific failure metadata;
- no knowledge of HTTP status codes, TypeORM, or the Moshaver database.

`apps/api` keeps the transport/infrastructure adapter: it supplies a TypeORM `DataSource` probe and maps probe failure to the existing `DATABASE_UNAVAILABLE` API error. `/health` and `/ready` response behavior stays unchanged.

### `@moshaver/cmb-realtime`

Provides an in-memory user-scoped event hub:

- subscribe/unsubscribe lifecycle;
- emit to one or many users;
- recipient de-duplication;
- connection counts;
- generic string event types with no Moshaver event vocabulary in the reusable package.

`apps/api` keeps the Nest injectable + RxJS `Observable` adapter and its product event union. Existing SSE controller behavior therefore remains unchanged.

## API contract authority

ADR 0003 makes `packages/api-contract` canonical for stable consumer-facing `/api/v2` transport contracts.

This slice adds `tooling/contracts/check-api-contract.mjs`, which verifies:

- seeded backend roles remain represented by the shared contract;
- capability literals observed in backend source remain represented by the shared contract;
- the contract `/api/v2` base path matches the backend prefix;
- backend success/error envelopes still use `ok` semantics;
- OpenAPI's `ApiError` schema matches the runtime envelope.

The contract capability list was expanded additively to include backend capabilities that were already in use but missing from the shared package.

## Compatibility guarantees

This extraction does not intentionally change:

- `/api/v2` routes;
- `/health` or `/ready` routes;
- SSE endpoint path or event types;
- database schema/migrations;
- auth/session behavior;
- Moshaver domain logic.

The only API documentation correction is that OpenAPI now describes the error envelope field as `ok: false`, matching actual runtime behavior.

## Package/install model

The new packages participate in `tooling/workspace/projects.json` and keep the Phase-2 leaf-lockfile model. They use public package entrypoints and have their own Node tests.

Backend depends on `@moshaver/cmb-health` and `@moshaver/cmb-realtime`; those depend on `@moshaver/cmb-kernel`. The repository architecture scanner therefore sees and enforces the intended direction:

```text
backend-v2 composition/adapters
        ↓
cmb-health   cmb-realtime
        \       /
        cmb-kernel
```

No CMB package imports Moshaver product/application code.

## Remaining Phase 3 waves

After W1 is stable:

1. W2 — users, organizations, system primitives;
2. W3 — auth, authorization, notifications after policy/recipient decoupling;
3. W4 — split generic activity/import-export mechanisms from Moshaver-specific handlers;
4. remove Phase-1 deep-import baseline entries as each public module boundary replaces implementation imports.

Each wave should stay focused and preserve `/api/v2` compatibility.
