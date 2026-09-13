# Workspace foundation — Phase 2

**Status:** complete  
**Adopted:** 2026-09-13

Phase 2 establishes repository-level orchestration without moving source code or changing product behavior.

## Decision

Moshaver uses a **native Node/npm orchestration layer with an explicit project DAG**, while preserving the existing project-local lockfiles.

We intentionally do **not** enable npm's root `workspaces` field in this phase. The repository already has independent lockfiles and `npm ci` flows for Backend, Admin, Student Core, and Student App. Enabling workspace discovery before an authoritative root-lock migration would change installation semantics and create two competing dependency authorities.

We also do **not** adopt Nx or Turborepo yet. The current repository has five graph nodes and existing component CI. A custom zero-dependency runner is sufficient to make order, ownership, and validation explicit without introducing a second build system.

## Current project graph

```text
api-contract
├── admin-v2
└── student-core
    └── student-app-v2

backend-v2   (independent at package-manifest level today)
```

The machine-readable source is `tooling/workspace/projects.json`.

This graph records package-level dependencies only. It does not replace the backend module inventory or Graphify file-level relationships.

## Install authority

Current install model: `leaf-lockfiles`.

| Project | Install authority |
| --- | --- |
| backend-v2 | `backend-v2/package-lock.json` |
| admin-v2 | `admin-v2/package-lock.json` |
| student-core | `student-core/package-lock.json` |
| student-app-v2 | `student-app-v2/package-lock.json` |
| api-contract | no install step today |

The root `package.json` contains orchestration scripts only. It has no root dependencies and no `workspaces` field.

A future move to native npm workspaces must be its own migration PR that creates an authoritative root lockfile, proves reproducible installs, updates CI, and defines rollback. Do not mix that migration with CMB extraction.

## Repository commands

```bash
npm run workspace:check
npm run workspace:list
npm run workspace:plan -- build
npm run bootstrap
npm run build
npm run test
npm run typecheck
npm run lint
npm run verify
```

`bootstrap` performs dependency-aware `npm ci` operations using each project's own lockfile. The runner builds `student-core` before downstream Student App validation because `student-app-v2` consumes `@moshaver/student-core` through a local file dependency.

Targeted execution includes dependencies automatically:

```bash
node tooling/workspace/run.mjs verify --project=student-app-v2
```

## Validation model

`tooling/workspace/check.mjs` fails when:

- project ids or paths are duplicated;
- an expected package manifest is missing;
- graph package names disagree with package manifests;
- a local package dependency is missing from the graph;
- the graph declares a local edge not present in the consumer manifest;
- a required leaf lockfile is missing;
- a verification task is not defined;
- a bootstrap-build project has no build script;
- the project graph contains a cycle.

`.github/workflows/workspace-foundation.yml` runs this structural validation on relevant pull requests and pushes.

## TypeScript project-reference decision

No new cross-project TypeScript solution is introduced in Phase 2.

Reasons:

- Backend currently uses a CommonJS Nest TypeScript configuration.
- Admin and Student App already use their own solution-style app/node references.
- Student Core is a standalone package and is not currently configured as a composite project.
- `api-contract` exposes TypeScript source directly.

Forcing all projects into one TypeScript reference graph would increase migration surface without improving the current build contract. The explicit project DAG is the cross-project build-order authority for now. Existing per-project TypeScript references remain unchanged.

## When to reconsider Nx/Turborepo or unified npm workspaces

Re-evaluate when one or more of these become material:

- package count grows enough that manual affected-project selection becomes costly;
- CI time is dominated by repeat work that remote/local caching would materially reduce;
- generators and tag-based dependency-boundary enforcement become frequent needs;
- one authoritative root lockfile is operationally preferable to project-local locks;
- graph-aware release/version tooling becomes a bottleneck.

Adoption must solve an observed repository problem, not just normalize folder aesthetics.

## Rollback

Phase 2 is intentionally low-risk. Removing the root orchestration manifest, `tooling/workspace/`, and its workflow returns the repository to the existing leaf-project commands. No runtime source, dependency version, lockfile, API, schema, or directory needs to be reverted.

## Phase 2 exit criteria

- [x] repository-wide commands are documented;
- [x] cross-project dependency/build order is machine-readable;
- [x] local package edges are validated against package manifests;
- [x] leaf lockfile authority is explicit;
- [x] a new project can be added through a predictable checklist;
- [x] existing component package scripts remain the execution authority;
- [x] tooling choice and rollback are documented;
- [x] CI validates the workspace graph without installing application dependencies;
- [x] no application directories moved and no product behavior changed.
