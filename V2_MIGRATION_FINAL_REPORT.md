# Moshaver API v2 migration final report

Date: 2026-09-05

## Decision

The implementation and migration tooling are complete enough for a controlled staging cutover, but v1 must **not** be retired yet. Keep `/api/v1` and `/api/v2` in parallel until the remaining browser/native and all-role staging checks below are recorded. No v1 source was deleted.

## Backend parity and contracts

- Backend v2 remains NestJS/Fastify with SQLite/TypeORM and 24 ordered migrations.
- Identity is explicit: users, roles, capabilities, organizations, active memberships, and typed active relationships are enforced server-side.
- Role-context dashboards exist for Student, Guardian, Advisor, Teacher, Mentor, Content Manager, Organization Admin, and Platform Admin.
- Plans/tasks/study, subjects, learning/reviews, assigned exams/server scoring, syllabus/retry/quizzes/mistakes, user notifications/push/SSE, explicit chat membership/groups, guardian views, activity/attention, reports/analytics/recommendations, import/export, releases/database operations, and offline sync have v2 routes.
- Generated OpenAPI is served at `/api/v2/openapi.json` and interactive docs at `/api/v2/docs`. Runtime inspection found 182 paths, 224 operations, 49 schemas, cookie/CSRF schemes, and 91 capability-annotated operations.
- `packages/api-contract` centralizes role/capability, envelope/error, pagination, notification, account context, and sync transport contracts without TypeORM entities.
- `docs/api-migration-manifest.json` is machine-validated and records intentional differences plus frontend integration status.

## Data migration

`backend-v2/scripts/migrate-v1-to-v2.mjs` opens v1.4 SQLite read-only, requires an explicit legacy organization and explicit platform-owner decision, preserves stable IDs, maps only source-backed Advisor/Teacher/Guardian relationships, and does not migrate sessions. It creates `migration-report.json` with required integrity checks.

Against the repository's actual v1.4 database the rehearsal migrated 2 users, 1 student, 37 plans, 958 tasks, 4 study sessions, 3 learning items/6 reviews, 8 exams/24 syllabus rows, 140 quizzes/889 questions/1 attempt, 2 conversations/59 messages, 37 notifications, 6 releases, and 316 audit rows. All integrity checks and foreign-key checks were zero. A second run inserted zero rows.

## Admin v2

- API v2 is now the default; v1 selection remains a development-only rollback switch.
- Authentication loads `/me/context`; context can switch without logout. Central requests use cookies, CSRF retry, distinct 401 handling, and 403 page/action behavior.
- Primary routes now have capability guards and desktop/mobile navigation filters capability-protected destinations.
- User-scoped notification/chat/activity events share the centralized SSE client and invalidate scoped query data.
- Production build and all 74 unit/component tests pass.

Remaining staging work: exercise every page/action with real Guardian, Advisor, Teacher, Mentor, Content Manager, Organization Admin, and Platform Admin accounts. Some specialized role home/navigation labels reuse shared pages rather than bespoke role-specific screens; that is a UX follow-up, not an authorization fallback.

## Student app v2 and student-core

- Boot sequence restores login, loads `/me/context`, rejects non-STUDENT accounts, loads server-owned self data, initializes local state/sync cursor, and connects user-scoped SSE in chat.
- API calls stay in the client/store and student-core integration boundaries. Self operations do not supply arbitrary student IDs.
- Offline upload batches include `clientMutationId`; opaque cursors persist in web/Tauri providers and reconciliation refreshes domain state.
- Exam assignment/deadline/scoring, identity, roles, permissions, relationships, and published plan ownership remain server-authoritative. Local app state/PIN does not grant backend authority.
- Student-core build and 7 tests pass; student web/PWA production build passes.

Remaining device work: Android/Tauri packaging, native notification delivery, process-kill/reconnect, and multi-device/session expiry require the platform toolchains and real devices. These were not represented as passed.

## Security

See `SECURITY_V2_RELEASE_AUDIT.md`. The prior P1 legacy `ADMIN` escalation fallback was removed. The current automated audit has no open P0/P1; the all-role staging HTTP/browser matrix remains a P2 verification task.

## Cutover and rollback gate

1. Provision representative staging accounts and complete the admin/student matrices in `docs/V1_TO_V2_MIGRATION_CHECKLIST.md`.
2. Run browser PWA and available Tauri/Android tests; record push/native limitations.
3. Freeze v1 writes for the final window, take an immutable SQLite backup, and migrate into a newly migrated v2 target.
4. Require a successful report, zero integrity failures, and an idempotent second run.
5. Switch clients to v2, monitor auth failures, 403s, sync rejects, SSE reconnects, and SQLite health.
6. Retain both database and client rollback paths. Keep v1 runtime/source frozen as legacy evidence until the monitoring window closes.

## Deprecated aliases and future cleanup

- Platform-only `/api/v2/admin/*` compatibility aliases remain while legacy admin feature calls are measured.
- The admin development API-version switch remains as rollback tooling; production defaults to v2.
- After cutover, remove unused aliases, expand generated response decorators, split oversized frontend chunks, and automate the complete role/browser matrix.
- A future PostgreSQL/Prisma move should be a separate, rehearsed migration after SQLite v2 stabilizes. Preserve UUIDs, membership/relationship constraints, opaque sync semantics, audit history, and transaction boundaries; do not combine it with the v1 retirement event.
