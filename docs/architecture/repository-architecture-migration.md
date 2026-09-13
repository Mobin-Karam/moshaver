# Repository architecture migration plan

The target architecture is intentionally adopted **without moving source code now**.

## Phase 0 — architecture contract (this change)

- document project classes and dependency direction;
- define the future grouped layout;
- define CMB/product/application boundaries;
- update repository/agent guidance;
- keep every current application path unchanged.

No runtime behavior changes.

## Phase 1 — make the current layout graphable

Before moving directories:

- generate/refresh Graphify for current v2;
- inventory project-to-project imports;
- document current package consumers;
- identify cycles/deep imports;
- classify every backend module as kernel, platform, adapter, or Moshaver product domain;
- establish CI checks for affected projects.

Still no physical moves required.

## Phase 2 — workspace foundation

Only after current validation is green:

- decide whether native workspaces alone are sufficient or whether Nx/Turborepo is justified;
- add a root private workspace manifest and shared task entrypoints;
- introduce TypeScript project references where beneficial;
- make build order explicit;
- keep old directory names temporarily if that reduces migration risk.

This phase changes tooling but should not change product behavior.

## Phase 3 — extract low-risk reusable packages

Start with stable boundaries rather than large domains:

1. API/event contracts;
2. CMB kernel primitives;
3. shared test helpers/config where duplication is proven;
4. small platform capabilities with clear ownership.

Each extraction should be one focused PR with compatibility tests.

## Phase 4 — thin the backend composition root

Incrementally move reusable/platform capability implementations out of `backend-v2` while leaving the API application as the composition root.

Do not move all backend modules at once.

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
