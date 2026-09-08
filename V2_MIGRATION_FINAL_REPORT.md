# Moshaver API v2 migration final report

Date: 2026-09-06

## Decision

The repository implementation, contracts, migration tool, parity gates, and local release-quality checks for Prompts 0–28 are complete. It is ready for a controlled staging cutover. v1 remains frozen as rollback evidence and must not be removed until the production cutover and monitoring gate succeeds.

## Delivered architecture

- `backend-v2`: NestJS/Fastify, SQLite/TypeORM, 32 ordered migrations, explicit users/roles/capabilities, organizations/memberships, typed relationships, and teacher-subject assignments.
- Canonical v2 domains cover auth/context, users, organizations, relationships, students, plans/tasks/study, subjects, learning/reviews, exams/questions/assignments/publishing, syllabus/retry/quizzes/mistakes, notifications/push/SSE, direct/group chat, guardian workflows, role dashboards, presence/activity/live monitoring, reports/recovery/analytics/recommendations, import/export, releases/audit/backup-restore, and offline sync.
- OpenAPI is generated at `/api/v2/openapi.json` with interactive docs at `/api/v2/docs`. Shared transport types live in `packages/api-contract`; persistence entities do not leak into that package.
- `admin-v2` is pinned to `/api/v2`. Its development backend switch changes host only; there is no runtime v1/v2 API selector. Canonical APIs replace the former `/admin/*` placeholder surface, and capability checks cover routes, navigation, and relevant actions.
- `student-app-v2` and `student-core` use server-owned student identity and authoritative exam/plan/permission data. Offline mutations use idempotency keys and opaque cursors. The PWA registers v2 push subscriptions, handles push/click events, and reports presence only after authentication.

## Data migration rehearsal

`backend-v2/scripts/migrate-v1-to-v2.mjs` opens v1.4 SQLite read-only, requires explicit legacy-organization and platform-owner decisions, preserves stable IDs, maps only source-backed relationships, never migrates sessions, and writes an integrity report.

The actual repository v1.4 database was migrated into a fresh 32-migration target:

| Domain | Migrated rows |
| --- | ---: |
| Users / students | 2 / 1 |
| Plans / tasks / study sessions | 37 / 958 / 4 |
| Learning items / reviews | 3 / 6 |
| Exams / syllabus | 8 / 24 |
| Quizzes / questions / attempts | 140 / 889 / 1 |
| Conversations / messages | 2 / 59 |
| Notifications / releases / audit | 37 / 6 / 316 |

All report integrity counters and SQLite foreign-key checks were zero. All eight migrated legacy exams are published to preserve their prior visibility semantics. A second migration run inserted zero rows. v1 has no teacher-subject assignment source, so the migration does not fabricate those links; administrators assign them explicitly in v2.

## Verification evidence

- Backend: lint, build, 12 suites / 50 tests, security-matrix E2E, and full student-journey E2E passed.
- Admin: parity audit passed 12 areas / 46 integrations; 28 test files / 77 tests and production build passed.
- Browser: Student PWA login/navigation/offline/reconnect passed; the service worker controlled the page and `PushManager` was available. Admin passed 112 route checks across Guardian, Advisor, Teacher, Mentor, Content Manager, Organization Admin, and Platform Admin. Multi-role Advisor-to-Teacher switching changed authorization without re-login.
- Shared/native: `student-core` passed 7 tests and build. Tauri Cargo check/test/build and Android Gradle check completed successfully in the full project validator.
- Migration: fresh schema, actual-data migration, zero integrity/FK failures, published-exam compatibility, and repeat-run idempotency passed.

## Honest limits

- Real Web Push delivery was not executed because it requires target-environment VAPID keys and browser permission.
- Tauri/Android compiled successfully, but no real-device runtime, process-kill recovery, or native-notification delivery test was performed.
- No production database was replaced and no deployed traffic was switched. Destructive restore testing stays limited to disposable databases.

## Production cutover and rollback gate

1. Provision production-like staging identities and rerun the role, student, browser, push, and migration checks.
2. Freeze v1 writes, create and verify an immutable SQLite backup, and migrate into a freshly migrated v2 target.
3. Require a successful migration report, zero integrity/FK failures, and an idempotent second run.
4. Switch clients to v2 and monitor login failures, 403/404 changes, sync rejects, SSE reconnects, push delivery, and SQLite health.
5. Preserve the v1 database and client rollback path through the monitoring window. Retire v1 runtime/source only after an explicit go/no-go review.

## Future database evolution

A PostgreSQL/Prisma migration is a separate project after SQLite v2 stabilizes. Preserve UUIDs, membership/relationship/teacher-subject uniqueness, audit history, opaque sync semantics, and transaction boundaries; do not combine it with the v1 retirement event.
