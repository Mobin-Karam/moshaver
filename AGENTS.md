# Moshaver AI Engineering Guide

Moshaver is a multi-application monorepo. Treat this file as the primary repository-wide operating contract for AI coding agents.

## Graphify-first discovery

Before broad grep/search or reading many source files, use the repository knowledge graph when `graphify-out/graph.json` is available.

Preferred order:

1. Query Graphify for the concept, flow, caller/callee relationship, or impact area.
2. Use Graphify path/neighbor information to identify the smallest relevant file set.
3. Open those source files and verify the graph evidence before editing.
4. If the graph is missing or stale, refresh it with the Graphify skill (`/graphify . --update`; Codex uses `$graphify`) when available.
5. Fall back to repository search only when Graphify cannot answer the question or source-level verification is required.

Graph evidence is navigation/context, not a replacement for reading the source of files being changed.

See `docs/architecture/graphify.md` and `.agents/skills/graphify/SKILL.md`.

## Repository map

- `backend-v2/` — NestJS/Fastify/TypeORM API and current Moshaver backend composition root.
- `admin-v2/` — React/Vite administration application.
- `student-app-v2/` — React/PWA/Tauri student application.
- `student-core/` — runtime-neutral student domain/provider contracts.
- `packages/api-contract/` — shared API contracts.
- `docs/` — architecture, migration, operations, product, and release documentation.
- `.github/` — agents, prompts, instructions, workflows, and repository automation.

## Backend architecture direction

The reusable backend initiative is **CMB — Composable Modular Backend Architecture** (tracking epic #21).

When changing backend architecture:

- keep the reusable kernel independent from Moshaver education domains;
- keep product modules such as students, plans, exams, reports, guardian, tasks, and study sessions outside the reusable kernel;
- prefer explicit module contracts and public entrypoints over private cross-module imports;
- keep infrastructure replaceable where portability justifies it;
- preserve `/api/v2` compatibility unless a breaking change is explicitly approved;
- do not weaken authentication, authorization, CSRF, validation, tenant isolation, or audit boundaries.

## First actions

1. Read this file and `.github/copilot-instructions.md`.
2. Query Graphify first when the graph exists.
3. Read applicable `.github/instructions/*.instructions.md` files.
4. Run `.github/ai-toolkit/scripts/detect-project.sh` when a shell is available.
5. Read `.agent-state/project.json` if present.
6. Inspect nearby tests, package scripts, migrations, and public contracts before editing.

## Engineering rules

- Repository source and executable tests are authoritative; documentation and graphs may drift.
- Prefer existing libraries, patterns, tokens, modules, and commands.
- Make the smallest complete change that satisfies the requirement.
- Preserve public contracts unless a breaking change is explicitly requested.
- Never invent repository facts. Mark unresolved facts as `UNKNOWN`.
- Never expose, print, commit, or fabricate secrets.
- Never disable security controls to make a change pass.
- For bugs, identify the root cause and add a regression test when practical.
- For database changes, inspect migration history, data compatibility, constraints, and rollback safety.
- For UI work, cover loading, empty, error, disabled, responsive, keyboard, accessibility, theme, and Persian/RTL behavior where relevant.
- For API changes, identify admin/student/other consumers and synchronize shared contracts.

## Validation

Use component-defined commands first.

### Backend

```bash
cd backend-v2
npm ci
npm run lint
npm test
npm run build
```

### Admin

```bash
cd admin-v2
npm ci
npm run typecheck
npm run format:check
npm run lint
npm test
npm run test:a11y
npm run build
```

### Student core

```bash
cd student-core
npm ci
npm run build
npm test
```

### Student app

```bash
cd student-app-v2
npm ci
npm run typecheck
npm test
npm run test:a11y
npm run build
```

Generic toolkit fallback:

```bash
.github/ai-toolkit/scripts/validate-project.sh quick
```

Release-quality fallback:

```bash
.github/ai-toolkit/scripts/validate-project.sh full
```

Never claim a validation command passed unless it actually ran successfully.
