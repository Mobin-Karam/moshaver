# Developer handbook

This is the starting point for humans extending or maintaining Moshaver. It applies to the repository inspected on 2026-09-08. Read the [system map](../architecture/system-map.md) before changing code and use the [repository runbook](./repository-runbook.md) for commands.

## Identify the active product line

| Target | Frontend | Backend | API |
| --- | --- | --- | --- |
| Current v2 development | `admin-v2`, `student-app-v2` | `backend-v2` | `/api/v2` |

The v1.4 line is archived on `archive/v1.4` and is not maintained in `main` or `develop`. Do not copy its routes, schemas, or runtime assumptions into v2 without an explicit compatibility change. Direct source and tests are authoritative; migration audits describe gaps at the time they were written.

## Prepare a local checkout

1. Read `AGENTS.md` and `.github/copilot-instructions.md`.
2. Inspect `git status --short`. Preserve changes you did not create.
3. Run `.github/ai-toolkit/scripts/detect-project.sh`.
4. Install dependencies only in packages you will change.
5. Copy `.env.example` to `.env` where required, but never commit the result.
6. Run the smallest existing test that covers the current behavior before editing.

For v2 web development, start the backend first and then the relevant frontend:

```bash
npm --prefix backend-v2 install
npm --prefix backend-v2 run migration:run
npm --prefix backend-v2 run seed
npm --prefix backend-v2 run dev

npm --prefix admin-v2 install
npm --prefix admin-v2 run dev
```

Use a disposable SQLite path for seed, migration, restore, or destructive test work. Development seed credentials are local-only and must never be copied to a deployed environment.

## Find the owning code

Trace a workflow vertically before editing:

```text
route/navigation
  -> page and feature components
  -> query/mutation or client adapter
  -> HTTP controller and capability guard
  -> service and validation
  -> entity/migration
  -> tests and operational documentation
```

Useful searches:

```bash
rg "route-or-capability" admin-v2/src backend-v2/src
rg "Controller|RequireCapabilities" backend-v2/src/modules
rg "useQuery|useMutation" admin-v2/src/features
rg --files admin-v2/src backend-v2/src | rg 'test|spec|migration'
```

## Architecture rules

### Admin v2

- Keep `app/router.tsx` and `app/layout/admin-navigation.ts` synchronized.
- Put feature API functions under `features/<feature>/api/` and reuse `shared/ui/` primitives.
- Tabular directories should use `AdminDataTable`; the feature owns selection and authorized batch actions.
- The persistent layout owns page title and breadcrumbs. Pages start with operational controls, not another hero title.
- Gate routes and actions separately. Read access does not imply create, update, archive, backup, restore, or release management.
- Handle loading, empty, error, retry, disabled, read-only, narrow viewport, keyboard, and dark-mode states.

### Backend v2

- Controllers define HTTP contracts and capability requirements; services own business rules.
- Validate external input with DTOs and established validation patterns.
- Scope reads and writes through authenticated context. Never trust organization or student identifiers without authorization checks.
- Use TypeORM migrations for durable schema changes; do not rely on schema synchronization.
- Preserve the success envelope, structured errors, session authentication, and CSRF protection.

### Student v2

- Keep reusable domain logic and providers in `student-core`.
- Keep browser, PWA, Tauri, SQLite, notification, and device behavior in `student-app-v2` adapters.
- Validate web and native runtimes separately.

## Complete a change

1. Reproduce or define current behavior.
2. Trace API, permission, data, and UI consumers.
3. Make the smallest complete vertical change.
4. Add a regression test or explain why one is not practical.
5. Run checks from the [verification matrix](./repository-runbook.md#change-verification-matrix).
6. Perform browser, native, or HTTP smoke verification when required.
7. Update current docs, capability matrices, migration plans, and release notes.
8. Review `git diff --check`, `git diff --stat`, and `git status --short`.

## Definition of done

- Intended roles can complete the workflow and unauthorized roles cannot invoke it.
- Validation and tenant/student scope are server-enforced.
- Loading, empty, failure, retry, success, and destructive states are usable.
- API types and consumers agree.
- Relevant automated checks actually pass.
- Destructive database testing used a temporary target.
- Documentation states what was and was not verified.

Continue with the [feature and bug playbook](./feature-and-bug-playbook.md), [maintenance guide](./maintenance-guide.md), and [documentation maintenance guide](./documentation-maintenance.md).
