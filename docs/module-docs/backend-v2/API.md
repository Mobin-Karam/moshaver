<!-- DOCS_NAV_START -->
[Docs Home](../../README.md) | [Runbook](../../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../../student-app-v2-gap-analysis.md) | [Student Core](../../student-core-architecture.md) | [Tauri](../../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# API v2

All routes are under `/api/v2` except health checks.

## Health

- `GET /health`
- `GET /ready`

## Auth

- `POST /api/v2/auth/login`
- `GET /api/v2/auth/me`
- `POST /api/v2/auth/logout`

Login returns:

```json
{
  "ok": true,
  "data": {
    "user": { "id": "...", "username": "admin", "role": "ADMIN" },
    "csrfToken": "...",
    "expiresAt": "..."
  }
}
```

Mutating requests should send `X-CSRF-Token`.

## Student

- `GET /api/v2/students/me`
- `GET /api/v2/student/dashboard`
- `GET /api/v2/student/today`
- `GET /api/v2/student/plans`
- `POST /api/v2/student/tasks/:id/complete`
- `GET /api/v2/student/progress`
- `GET /api/v2/student/reviews`
- `GET /api/v2/student/exams`
- `POST /api/v2/student/exams/:id/start`
- `POST /api/v2/student/exams/:id/submit`

## Admin

- `GET /api/v2/admin/dashboard`
- `GET /api/v2/admin/students`
- `GET /api/v2/admin/students/:id`
- `GET /api/v2/admin/students/:id/analytics`
- `POST /api/v2/admin/plans/import/preview`
- `POST /api/v2/admin/plans/import`
- `POST /api/v2/admin/exams`
- `POST /api/v2/admin/questions/import`
- `POST /api/v2/admin/recommendations`

## Sync

- `GET /api/v2/sync?lastSync=...`
- `POST /api/v2/sync/upload`

## Realtime

- `GET /api/v2/events`

SSE event names:

- `message`
- `notification`
- `plan.updated`
- `exam.created`
- `system.update`
