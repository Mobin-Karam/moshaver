# Repository architecture migration plan

The target architecture is intentionally adopted **without moving source code now**.

## Phase 0 — architecture contract

Status: **complete**.

- [x] document project classes and dependency direction;
- [x] define the future grouped layout;
- [x] define CMB/product/application boundaries;
- [x] update repository/agent guidance;
- [x] keep every current application path unchanged.

No runtime behavior changed.

## Phase 1 — make the current layout graphable

Status: **in progress**.

Completed source-backed inventory work:

- [x] inventory all `backend-v2/src/modules` directories;
- [x] distinguish active `AppModule` registrations from dormant module placeholders;
- [x] inventory explicit Nest module-to-module imports for high-value boundaries;
- [x] document hidden coupling cases where Nest metadata understates database/domain coupling;
- [x] classify every backend module as CMB foundation/platform/split candidate or Moshaver product/orchestration;
- [x] define extraction-readiness rules and W1–W4 candidate waves;
- [x] document current package consumers (`admin-v2`, `student-app-v2`, `student-core`, `api-contract`, `backend-v2`);
- [x] record that backend-v2 does not currently consume `@moshaver/api-contract` at package level;
- [x] establish component CI surfaces for backend, Admin, student-core, student app, and repository safety.

Still required before Phase 1 is complete:

- [ ] generate/refresh a current-v2 `graphify-out/graph.json`;
- [ ] validate the source inventory against Graphify file-level caller/callee paths;
- [ ] identify circular/deep imports that are not represented by Nest module metadata;
- [ ] define an automated forbidden-edge architecture check once stable package boundaries exist;
- [ ] resolve API-contract authority/versioning under CMB issue #27.

Phase-1 evidence lives in `docs/architecture/inventory/`.

No physical source moves are required in this phase.

## Phase 2 — workspace foundation

Status: **complete**.

Decision: use a zero-dependency repository orchestration layer and explicit project DAG while keeping existing leaf `package-lock.json` files authoritative. Do not enable npm root workspaces, Nx, or Turborepo in this phase.

Completed:

- [x] add a root private orchestration `package.json` with repository-wide task entrypoints;
- [x] define `tooling/workspace/projects.json` as the machine-readable cross-project DAG;
- [x] validate local package edges against package manifests;
- [x] make topological bootstrap/build/verification order explicit;
- [x] preserve project-local `npm ci` and leaf lockfile authority;
- [x] build `student-core` before downstream Student App bootstrap/validation;
- [x] add targeted project execution including transitive local dependencies;
- [x] document why a root TypeScript project-reference graph is not yet beneficial;
- [x] add a CI gate for graph consistency, cycles, scripts, manifests, and lockfiles;
- [x] document tooling-adoption triggers and rollback;
- [x] keep all current application directories and product behavior unchanged.

See `docs/architecture/workspace-foundation.md` and `tooling/workspace/README.md`.

A unified root lockfile/npm-workspaces migration, if later justified, must be a separate PR with reproducible-install proof and CI migration.

## Phase 3 — extract low-risk reusable packages

Start with stable boundaries rather than large domains.

Recommended order from the Phase-1 inventory:

1. API/event contract authority decision;
2. CMB foundation primitives;
3. W1: health and realtime packaging proof;
4. W2: users, organizations, and system primitives;
5. W3: auth, authorization, and notifications after product-policy decoupling;
6. W4: split generic activity/import-export mechanisms from Moshaver handlers;
7. shared test helpers/config only where duplication is proven.

Each extraction should be one focused PR with compatibility tests.

## Phase 4 — thin the backend composition root

Incrementally move reusable/platform capability implementations out of `backend-v2` while leaving the API application as the composition root.

Do not move all backend modules at once.

Product orchestration modules such as `sync`, `dashboard`, `guardian`, and `onboarding` should remain product-owned and gradually consume stable public module APIs instead of reaching into private persistence.

## Phase 5 — optional physical `apps/` normalization

Only after import boundaries and CI are stable, consider moving:

- `backend-v2` → `apps/api`
- `admin-v2` → `apps/admin`
- `student-app-v2` → `apps/student`
- `student-core` → an appropriate `packages/product/` location

A physical rename is cosmetic unless it improves tooling/ownership. Skip a move if its churn exceeds its benefit.

## Phase 6 — generators and enforceable boundaries

- CMB module generator;
- product-module generator;
- standard package manifest templates;
- automated dependency-boundary checks;
- affected CI/caching if repository scale justifies it.

## Non-goals

This plan does **not** require:

- converting to microservices;
- replacing NestJS, React, TypeORM, Vite, or Tauri;
- rewriting existing modules;
- changing `/api/v2`;
- moving all code to `packages/`;
- adopting Nx or Turborepo immediately.

## Success criteria

The architecture migration is successful when:

- a developer can identify ownership from a project/package name;
- applications contain composition/runtime concerns rather than duplicated platform implementations;
- reusable CMB packages can be consumed by a non-Moshaver example app;
- forbidden dependency directions fail CI;
- Graphify/project tooling exposes an accurate dependency graph;
- each deployable can be built/tested through an explicit dependency-aware task graph.
