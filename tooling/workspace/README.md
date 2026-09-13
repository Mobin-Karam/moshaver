# Workspace foundation

This directory is the repository-level project graph and task runner for Moshaver Phase 2.

## Authority

`projects.json` is the authoritative cross-project dependency DAG until a later, explicit unified-workspace/lockfile migration is approved.

The root `package.json` is **orchestration-only**. It intentionally has no dependency list and no `workspaces` field.

Existing leaf lockfiles remain authoritative:

- `backend-v2/package-lock.json`
- `admin-v2/package-lock.json`
- `student-core/package-lock.json`
- `student-app-v2/package-lock.json`

Do not run a root dependency install expecting a unified `node_modules`. Use `npm run bootstrap`, which executes `npm ci` inside each installable project in dependency order.

## Commands

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

Target one project plus its dependencies:

```bash
node tooling/workspace/run.mjs verify --project=student-app-v2
node tooling/workspace/run.mjs bootstrap --project=student-app-v2
```

Preview without executing child npm commands:

```bash
node tooling/workspace/run.mjs verify --dry-run
```

## Bootstrap semantics

The runner topologically orders the graph. `student-core` is marked `bootstrapBuild: true`, so it is built after its own install and before `student-app-v2` is installed/validated. This preserves the current local `file:../student-core` package contract.

`api-contract` has `install: false` because it currently has no dependency lock or build step; consumers use its TypeScript public entrypoint directly.

## Adding a project

1. Add/verify the project's `package.json`.
2. Keep a project-local `package-lock.json` while the install model is `leaf-lockfiles` (unless the project intentionally has `install: false`).
3. Add exactly one node to `projects.json`.
4. Declare every direct local package dependency in `dependsOn`.
5. List release-quality scripts in `verifyTasks`.
6. Set `bootstrapBuild` only when downstream local-file consumers need built output before installation/validation.
7. Run `npm run workspace:check` and `node tooling/workspace/run.mjs verify --dry-run`.

## Non-goals

This tooling does not replace npm, package-level scripts, component CI, Nx, Turborepo, or Graphify. It provides the smallest deterministic repository task graph needed before package extraction begins.
