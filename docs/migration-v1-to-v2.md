<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Runbook](./REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student Core](./student-core-architecture.md) | [Tauri](./tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver Backend v1 to v2 Migration

## Strategy

Keep `backend/` as backend v1 and add `backend-v2/` as a separate NestJS/Fastify service. Backend v2 starts with its own TypeORM-managed schema, then receives staged data migration scripts after endpoint parity is tested.

## Old Database

The existing SQLite database is direct-SQL managed by `backend/src/db.js`. It stores users, sessions, students, plans, tasks, exams, quizzes, attempts, chat, notifications, realtime events, imports, and audit logs.

## New Entities

Backend v2 defines TypeORM entities for:

- `User`, `Session`
- `Student`
- `Plan`, `Task`
- `Exam`, `Question`, `ExamAttempt`
- `Mistake`, `TopicMastery`
- `Notification`, `ChatMessage`
- `AuditLog`

## Migration Steps

1. Run backend v1 and backend v2 side by side in development.
2. Freeze v2 entity changes behind migrations before production testing.
3. Build data export from v1 SQLite using read-only connections.
4. Transform v1 rows into v2 DTOs with explicit validation.
5. Import into a fresh v2 SQLite database.
6. Run parity checks for auth, students, plans, exams, notifications, chat, and audit history.
7. Point Admin v2 to `/api/v2` in staging.
8. Cut over production traffic after a tested rollback window.

## Rollback Plan

- Keep the v1 database untouched during first v2 deployments.
- Keep `/api/v1` served by backend v1 until v2 is proven.
- If v2 fails, switch clients back to v1 endpoints and preserve v2 logs/database for diagnosis.

## PostgreSQL Path

Entities avoid SQLite-only column types where possible. JSON fields use TypeORM `simple-json` in SQLite and can move to native JSONB in a PostgreSQL migration once production switches database type.
