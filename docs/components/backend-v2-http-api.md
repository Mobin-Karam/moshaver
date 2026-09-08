# Backend v2 HTTP API

Inspected: 2026-09-08. Controllers under `backend-v2/src/modules/` and the generated OpenAPI document are authoritative.

## Discovery

The NestJS service applies `/api/v2` globally, except health routes:

- `GET /health`
- `GET /ready`
- Swagger UI: `GET /api/v2/docs`
- OpenAPI JSON: `GET /api/v2/openapi.json`

Use the OpenAPI document for an exact route/schema inventory. Do not manually copy a historical endpoint count into release gates.

```bash
curl -fsS http://localhost:4000/api/v2/openapi.json > /tmp/moshaver-v2-openapi.json
```

## Protocol contract

- Successful JSON responses use `{ "ok": true, "data": ... }`.
- Authentication uses an HTTP-only session cookie.
- Mutations require the current `X-CSRF-Token`.
- Protected staff operations use exact capabilities; student and guardian operations also enforce ownership/scope.
- `401` means authentication is missing or expired. `403` means the authenticated identity lacks role, capability, or resource scope.
- SSE is served from `GET /api/v2/events`.

## Current route families

| Domain | Canonical families |
| --- | --- |
| Identity | `/auth/*`, `/me/context`, `/users/*`, `/organizations/*`, `/relationships/*` |
| Students | `/students/*`, `/student/*`, `/guardian/students/*` |
| Planning | `/plans/*`, `/tasks/*`, `/student/tasks/*`, `/student/study-sessions/*` |
| Learning | `/students/:id/learning*`, progress, topics, analytics, recommendations, mistakes |
| Assessments | `/exams/*`, `/questions/*`, `/syllabus/*`, `/exam-attempt-requests/*`, `/quizzes/*` |
| Communication | `/chat/*`, `/notifications/*`, `/push/*`, `/events` |
| Operations | `/dashboard`, `/live`, `/attention`, `/reports`, `/recovery-requests` |
| Transfer | `/import/template`, `/import/preview`, `/import/commit`, `/import/history`, `/export/json` |
| System | `/app-versions`, `/app-releases`, `/audit`, `/system/database*` |
| Sync | `/sync`, `/sync/upload` |

The [Admin capability matrix](../ADMIN_V2_CAPABILITY_MATRIX.md) maps product workflows to endpoints and permissions. The [historical v1/v2 audit](../API_V1_V2_AUDIT.md) is migration evidence, not the live route catalog.

## Authentication example

`POST /api/v2/auth/login` accepts a username and password. The response includes user summary, CSRF token, and expiry. Clients keep the cookie in the browser cookie jar and store the CSRF token only for the session. Use `GET /api/v2/auth/me` to restore identity and `GET /api/v2/me/context` for roles, capabilities, memberships, and organizations.

Personal security endpoints are:

- `POST /api/v2/auth/change-password`
- `GET /api/v2/auth/sessions`
- `DELETE /api/v2/auth/sessions/:id`
- `POST /api/v2/auth/logout`

## Adding or changing an endpoint

1. Define the DTO and validation.
2. Enforce capability plus organization/student ownership in the backend.
3. Preserve the response/error envelope.
4. Add backend tests, including a forbidden role and cross-scope case.
5. Update frontend adapters and shared types.
6. Regenerate/inspect OpenAPI and update the capability matrix.
7. Run a disposable HTTP smoke for security-sensitive workflows.

See the [developer handbook](../operations/developer-handbook.md) and [feature playbook](../operations/feature-and-bug-playbook.md).
