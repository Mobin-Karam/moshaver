# Admin v2 API compatibility

Last source audit: 2026-09-08

Scope: the current `admin-v2` client and the canonical `backend-v2`
`/api/v2` contract. This document describes implemented source behavior, not
deployment or branch state. The detailed feature-by-feature status is maintained
in [`docs/ADMIN_V2_CAPABILITY_MATRIX.md`](../docs/ADMIN_V2_CAPABILITY_MATRIX.md).

## Contract

- Backend v2 is mounted at `/api/v2`; `/health` and `/ready` remain unprefixed.
- Successful JSON responses use the shared `{ ok, data }` envelope.
- Protected requests use the secure session cookie. Authenticated mutations also
  require the session CSRF header.
- Authorization is enforced by global session, role, capability, and CSRF guards;
  organization and student scope is enforced in the domain services.
- Request DTOs are validated with transformation, whitelisting, and rejection of
  unknown fields.
- The generated OpenAPI contract is available at `/api/v2/openapi.json`, with its
  interactive documentation at `/api/v2/docs`.

## Admin v2 compatibility coverage

- Authentication, session listing/revocation, password changes, work context,
  roles, and capabilities
- Role-aware dashboard summaries and advisor inbox workflows
- Student directory, profile, lifecycle, security actions, overview, progress,
  analytics, recommendations, mistakes, and durable learning records
- Plan and task CRUD, rescheduling, duplication, range publication, and JSON
  import/export
- Subject catalog, per-student subject state, and scoped teacher assignments
- Exam lifecycle, assignments, questions, attempts/results, syllabus, and retry
  request moderation
- Quiz lifecycle, quiz-question management, student runs, submission, and history
- Direct and group chat, including members, roles, permissions, ownership transfer,
  message edits/deletes, reactions, mute, read state, and leave flows
- Notification inbox, read state, preferences, Push subscriptions/status/testing,
  and realtime events
- Live student monitoring, attention/activity timelines, reports, recovery
  requests, task issues, study sessions, and synchronization
- Organizations, memberships, relationships, users, and role administration
- Import preview/commit/history, audit history, application versions/releases,
  database metadata, backup, and guarded restore

The Admin v2 parity audit currently represents all 12 legacy capability areas and
46 required client integrations. This is a source-level contract gate; it does not
replace authenticated API, browser, or deployment verification.

## Release boundaries

There is no known Admin v2 endpoint family still missing from the current backend
source. The remaining work is acceptance and rollout evidence:

- Receive a real VAPID-backed Push notification in a production-like browser.
- Exercise database restore only against a disposable deployment, because restore
  intentionally replaces the SQLite database and restarts the backend.
- Complete the historical Admin v1.6 retirement browser smoke suite on the target
  environment.
- Keep rollback available until target-environment monitoring and acceptance pass.

Do not infer production readiness from route presence alone. Before retiring the
legacy admin deployment, run the backend tests/build and disposable security/API
smokes, then run the Admin v2 tests, build, parity audit, and browser acceptance
listed in [`admin-v2/MIGRATION-AUDIT.md`](../admin-v2/MIGRATION-AUDIT.md).
