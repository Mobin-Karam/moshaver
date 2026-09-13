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

Status: **complete — W1 through W4 implemented**.

Completed in the W1 slice:

- [x] API-contract authority decision and executable drift check;
- [x] CMB kernel package with module descriptor/token primitives;
- [x] extract framework-neutral health/readiness mechanics;
- [x] keep TypeORM + HTTP health policy in the backend adapter;
- [x] extract framework-neutral realtime connection/event hub;
- [x] keep Nest/RxJS/SSE and product event vocabulary in the backend adapter;
- [x] add package tests and backend adapter compatibility tests;
- [x] wire package edges into the Phase-2 workspace graph.

Completed in the W2 slice:

- [x] extract framework-neutral identity normalization and capability projection;
- [x] extract organization scope and platform-role assignment policy;
- [x] keep TypeORM membership persistence and product chat effects in backend adapters;
- [x] extract application-version validation and audit projection;
- [x] keep SQLite backup/restore and operational policy in the API composition;
- [x] add standalone package tests and workspace dependency edges.

Completed in the W3 slice:

- [x] extract secure session credential lifecycle while retaining account/student eligibility in the product adapter;
- [x] extract capability and organization/work-context evaluation over persistence-neutral records;
- [x] retain student ownership and relationship authorization as Moshaver policy;
- [x] extract notification cursor, pagination, and public projection mechanics;
- [x] retain recipient resolution, persistence, realtime, and push delivery in backend adapters.

Completed in the W4 slice:

- [x] extract generic presence normalization, heartbeat de-duplication, and activity paging;
- [x] retain Moshaver event vocabulary, attention signals, and student/task persistence;
- [x] extract generic security-field rejection and numeric import normalization;
- [x] retain schema `2.0`, education codecs, authorization, transactions, and history as product behavior.

Remaining waves:

- [x] shared test/config extraction evaluated and skipped because no second-consumer duplication is proven;
- [x] replace all 72 baseline cross-module implementation imports with explicit module public entrypoints and shrink the baseline to zero deep imports; retain only the six source-backed TypeORM entity relationship cycles.

See `docs/architecture/phase-3-cmb-foundation-w1.md`.
See also `docs/architecture/phase-3-cmb-platform-w2.md`.
See also `docs/architecture/phase-3-cmb-platform-w3.md` and `docs/architecture/phase-3-cmb-mechanisms-w4.md`.

## Phase 4 — thin the backend composition root

Status: **complete for the current extraction scope**.

- [x] reusable mechanics live behind public `packages/cmb/*` entrypoints;
- [x] `apps/api` retains Nest, TypeORM, SQLite, push, transport, and product-policy adapters;
- [x] `CmbPlatformModule` groups platform adapters so `AppModule` remains the application composition root;
- [x] product orchestrators such as `sync`, `dashboard`, `guardian`, and `onboarding` remain product-owned.

Further thinning should occur only when a concrete adapter or product package has independent ownership and a real consumer.

## Phase 5 — optional physical `apps/` normalization

Status: **complete**.

- [x] moved the API composition root to `apps/api`;
- [x] moved the Admin application to `apps/admin`;
- [x] moved the Student web/PWA/Tauri application to `apps/student`;
- [x] updated workspace metadata, CI path filters, Dependabot, CODEOWNERS, Docker build contexts, documentation, and runtime commands;
- [x] preserved npm package names, Docker service identities, `/api/v2`, and runtime behavior.

The migration deliberately retains stable product identifiers such as `backend-v2` where they are package names, Docker service names, or historical document labels. They are no longer physical repository roots.

## Phase 6 — generators and stronger boundaries

Status: **complete**.

- [x] `npm run generate:cmb -- <id> [kind] [dependencies]` scaffolds a guarded CMB package manifest, public entrypoint, declarations, test, and README;
- [x] architecture validation checks every CMB package manifest, public export, descriptor, declaration, and application/framework backedge;
- [x] CI installs and tests every CMB package and re-runs workspace, architecture, and API-contract gates;
- [x] guarded product-package ownership generator with explicit dependency placeholders;
- [x] affected-project selection over Git ranges, including reverse consumers and dependency closure, without adding another orchestration framework.

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
