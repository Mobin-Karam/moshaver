# Maintenance guide

## Routine schedule

| Frequency | Work |
| --- | --- |
| Every change | Focused tests, package checks, permission review, docs update, diff inspection |
| Weekly | Failed CI, advisories, error trends, backup completion, disk growth, stale branches |
| Monthly | Disposable backup restore, capability review, small dependency updates, full validation |
| Before release | Migration rehearsal, disposable security E2E, browser role smoke, accessibility, rollback and docs review |
| After release | Health/readiness, login and critical workflow smoke, errors and rollback-window monitoring |

## Incident triage

1. Preserve sanitized evidence: time, role, scope, URL, request ID, and status.
2. Determine blast radius and whether writes are unsafe.
3. Disable only the affected operation if necessary; never bypass security.
4. Check `/health`, `/ready`, logs, database availability, storage, proxy configuration, and migrations.
5. Reproduce safely and follow the [bug workflow](./feature-and-bug-playbook.md#bug-workflow).
6. Record recovery, verification, and prevention work.

Never paste cookies, CSRF tokens, passwords, environment secrets, or personal data into issues or docs.

## Database maintenance

- Back up before migrations, imports, mass lifecycle changes, or restores.
- Verify SQLite integrity and schema before replacement.
- Rehearse restore only against a disposable database unless production recovery is explicitly authorized.
- Keep the pre-restore snapshot and expose only a safe rollback identifier.
- Run TypeORM migrations explicitly; never enable synchronization as a shortcut.
- Review indexes and pagination as directories and histories grow.
- Treat v1.4 and v2 databases as different contracts.

## Dependency updates

Read upstream security and breaking notes, update one related group at a time, run package tests/type/build/runtime smoke, and commit lockfiles with manifests. Inspect migrations and deployment images explicitly for NestJS, TypeORM, Vite, React Router, Tauri, or database-driver upgrades.

## Performance and security

- Measure before optimizing; inspect queries, indexes, payloads, and pagination before client workarounds.
- Keep Admin directories bounded and reuse the shared table.
- Review production chunks and test low-width Student experiences.
- Review capabilities and tenant scope for every endpoint.
- Preserve secure HTTP-only cookies, CSRF, input/upload validation, and account session invalidation.
- Run backend security E2E against disposable data before release.

## Recovery and debt

Record debt with current impact, generation, paths, target behavior, risks, and closure evidence. Do not call placeholders complete. Before release, know how to restore the prior artifact, handle migrations, restore data, and verify login and core workflows. An unrehearsed rollback is a hypothesis.

