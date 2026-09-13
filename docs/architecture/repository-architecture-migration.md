# Repository architecture migration plan

The target architecture is adopted incrementally; behavior and stable `/api/v2` compatibility take priority over cosmetic moves.

## Phase 0 — architecture contract

Status: **complete**.

- [x] document project classes and dependency direction;
- [x] define the future grouped layout;
- [x] define CMB/product/application boundaries;
- [x] update repository/agent guidance;
- [x] keep every current application path unchanged.

## Phase 1 — make the current layout graphable

Status: **complete**.

- [x] inventory backend modules and active/dormant registrations;
- [x] classify CMB vs product/orchestration ownership;
- [x] document package consumers and extraction waves;
- [x] generate/commit a current-v2 Graphify graph;
- [x] validate high-value caller/callee paths against source;
- [x] identify deep imports and existing entity import SCCs;
- [x] freeze existing debt into a machine-readable baseline;
- [x] add architecture checks that reject new debt/hard forbidden edges;
- [x] add Graphify source-fingerprint freshness enforcement;
- [x] resolve API-contract ownership/versioning through ADR 0003.

Phase-1 evidence lives in `docs/architecture/inventory/`, `tooling/architecture/`, and `graphify-out/`.

## Phase 2 — workspace foundation

Status: **complete**.

- [x] root private orchestration manifest;
- [x] machine-readable project DAG;
- [x] leaf-lockfile install model;
- [x] topological bootstrap/build/verification;
- [x] workspace consistency/cycle CI;
- [x] tooling adoption/rollback policy;
- [x] no forced Nx/Turborepo/npm-workspaces migration.

See `docs/architecture/workspace-foundation.md` and `tooling/workspace/README.md`.

## Phase 3 — extract low-risk reusable packages

Status: **in progress — W1 implemented on `architecture/phase-3-cmb-foundation-w1`**.

Completed in the W1 slice:

- [x] API-contract authority decision and executable drift check;
- [x] CMB kernel package with module descriptor/token primitives;
- [x] extract framework-neutral health/readiness mechanics;
- [x] keep TypeORM + HTTP health policy in the backend adapter;
- [x] extract framework-neutral realtime connection/event hub;
- [x] keep Nest/RxJS/SSE and product event vocabulary in the backend adapter;
- [x] add package tests and backend adapter compatibility tests;
- [x] wire package edges into the Phase-2 workspace graph.

Remaining waves:

- [ ] W2 — users, organizations, system primitives;
- [ ] W3 — auth, authorization, notifications after product-policy/recipient decoupling;
- [ ] W4 — split generic activity/import-export mechanics from Moshaver handlers;
- [ ] shared test/config packages only where duplication is proven;
- [ ] shrink the Phase-1 deep-import/cycle baseline as each extraction removes debt.

See `docs/architecture/phase-3-cmb-foundation-w1.md`.

## Phase 4 — thin the backend composition root

Incrementally move reusable/platform capability implementations out of `backend-v2` while leaving the API application as the composition root. Product orchestrators such as `sync`, `dashboard`, `guardian`, and `onboarding` remain product-owned and should consume stable public module APIs over time.

## Phase 5 — optional physical `apps/` normalization

Only after imports/package boundaries and CI are stable, consider physical renames such as `backend-v2` → `apps/api`, `admin-v2` → `apps/admin`, and `student-app-v2` → `apps/student`. Skip moves whose churn exceeds their benefit.

## Phase 6 — generators and stronger boundaries

- CMB/product module generators;
- package manifest templates;
- stronger public-entrypoint architecture checks after package extraction;
- affected CI/caching when repository scale justifies it.

## Non-goals

This plan does **not** require microservices, framework replacement, a big-bang rewrite, breaking `/api/v2`, moving all code to `packages/`, or immediate Nx/Turborepo adoption.

## Success criteria

- ownership is obvious from project/package names;
- reusable CMB packages can run outside the Moshaver application;
- application adapters own framework/transport wiring;
- product domains do not leak into CMB kernel/platform packages;
- forbidden dependency directions fail CI;
- Graphify/project tooling remains freshness-checked;
- each deployable is validated through the explicit dependency-aware task graph.
