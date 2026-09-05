# API v1 vs API v2 audit

Audit date: 2026-09-05

Scope: current `v1.4/backend` (`/api/v1`) and `backend-v2` (`/api/v2`). This is a source audit, not a statement that every route was exercised end to end.

## Executive summary

- v1 exposes **172** concrete routes: 167 direct registrations plus five routes generated through the chat `shareRoute` helper.
- v2 exposes **104** concrete routes when `/health`, `/ready`, and both aliases of the three mistake routes are counted.
- Endpoint count overstates v2 parity. Several v2 endpoints return placeholders, accept weakly validated `Record<string, unknown>` bodies, discard fields, or do not preserve v1 ownership and workflow semantics.
- The largest missing v2 surfaces are subjects and per-student subject settings, Web Push and notification preferences, group chat, presence/activity/live monitoring, app release management, audit-log access, database backup/restore, import export/template/history, recovery administration, review completion, exam syllabus/retry-request workflow, and the separate quiz workflow.
- The highest-risk false-parity areas are admin dashboard/inbox/reports/recommendations, exams scoped to students, combined plan+exam import, analytics, task completion feedback, notification pagination/admin support, and realtime isolation.

## Security and platform comparison

| Aspect | v1 | v2 | Finding |
|---|---|---|---|
| Authentication | Opaque hashed session cookie; authenticated routes declare roles | Opaque SHA-256-hashed session cookie; global session lookup plus `@Roles` | Broad parity |
| Authorization | Route roles plus resource-level checks in handlers/services | `@Roles` plus some resource ownership in services | V2 has no granular permissions model; group/member RBAC is absent |
| CSRF | Required for cookie-authenticated mutations except logout | Global guard for authenticated mutations except logout | Broad parity |
| Login abuse protection | Persistent per-IP and per-IP+username throttling/blocking | No login rate limiting found | **Missing in v2** |
| Mutation auditing | Broad `audit_logs` writes and admin audit endpoint | Audit entity exists, but no systematic write path or read endpoint was found | **Missing/incomplete in v2** |
| Validation | Mostly explicit handler/service validation; uneven but domain-specific | Strong DTO validation on a subset; many admin endpoints use raw object types or primitive bodies | **Incomplete in v2** |
| Response envelope | `{ok:true,data}` / structured error | `{ok:true,data}` / global exception filter | Broad parity |
| CORS/headers | Explicit allowlist and security headers | Fastify CORS allowlist and Helmet | Broad parity; deployment values still matter |
| Health/readiness | Root metadata, `/health`, `/ready`, versioned health/readiness, DB check | `/health` and `/ready`; readiness returns a constant | **V2 readiness does not actually verify DB connectivity** |
| Public version discovery | Public app-version endpoint | None | **Missing in v2** |
| Backup/restore | Admin metadata, backup download, validated atomic restore | None | **Missing in v2** |

## Capability parity matrix

| Domain | v2 status | What v1 has that v2 lacks or weakens |
|---|---|---|
| Auth/session | Partial | V2 lacks persistent login throttling; otherwise login, me, logout, password change, session list/revoke exist. |
| Student administration | Mostly present | V2 combines lifecycle operations into a wildcard action route with a generic thrown `Error` for invalid actions; request bodies are not DTO-validated. Audit events and richer v1 detail semantics are missing. |
| Dashboard/live/activity | Major gap | V2 admin dashboard is hard-coded empty. Presence heartbeat, activity recording, live students, attention queue, admin live/activity views are absent. |
| Plans/tasks | Partial | CRUD exists. V2 lacks v1 plan summary and batch task creation. Import fidelity is incomplete. V2 task completion returns `actualTests`/`difficulty` without persisting those fields on the task. |
| Subjects | Missing | All subject catalog CRUD and per-student subject customization endpoints are absent. |
| Study sessions | Present with path changes | Core active/start/pause/resume/heartbeat/finish exists; v2 uses `/student/study-sessions`. Validate client migration and returned timing semantics. |
| Exams | Partial/high risk | V2 has exam/question CRUD and attempts, but the exam entity has no student relation; admin `studentId` is ignored and student listing is not assignment-scoped. V1 syllabus and retry-request moderation are absent. |
| Quizzes | Missing as a distinct workflow | V1 quiz CRUD, question workflow, timed start/submit, detail, history and review are absent. V2 exam attempts do not reproduce the full quiz contract. |
| Mistakes | Partial | List/detail/update exists (with duplicate aliases). Verify field parity; v1 is tied to quiz-attempt mistakes while v2 uses its own entity. |
| Learning/reviews | Partial | Admin learning CRUD exists. Student create/update/delete/review-completion/history routes are missing; v2 student learning endpoints are read-only. Summary exam metrics and mistake patterns are placeholders. |
| Reports | Partial | Student create/list exists. V2 admin reports returns one synthetic empty row; admin report aggregation is not implemented. |
| Recovery | Partial | Student create/list exists in v2, but v1 admin list and decision/update workflow are absent. |
| Notifications | Partial | V2 supports student list/read/read-all only. Admin notification access, cursor pagination, unread filtering, URLs/data payload parity, and all push routes are absent. |
| Direct chat | Partial | Basic conversations/messages/send/read exist. Presence/pinning remain constant placeholders and rich message behavior is absent. |
| Group chat | Missing | Groups, membership, roles, ownership transfer, permissions, mute, edit/delete, reactions, mentions, replies, system messages and snapshot sharing are absent. |
| Realtime | High risk | V2 SSE has no role annotation and publishes one process-wide stream without user/student filtering. V1 registers authenticated SSE and emits scoped user/admin events. |
| Import/export | Partial/high risk | V2 preview/commit exists, but no export, templates or history. Combined imports ignore exams, are not fully transactional, and preview normalizes malformed input while reporting valid. |
| Sync/offline | New in v2, partial | Pull/upload is useful new functionality, but pull filters plans by `createdAt` rather than all relevant updates, attempts/notifications are not cursor-filtered, and upload supports only task completion and study sessions. |
| App/system operations | Missing | App-version/release CRUD, public version lookup, audit browsing, database metadata/backup/restore are absent. |
| Analytics/recommendations | Placeholder | Analytics returns null/empty values; admin recommendations merely echoes input as accepted. |

## Complete v1 endpoint inventory

Legend: Public = no authenticated role; A = admin; S = student. All authenticated cookie mutations are CSRF-protected.

### System and authentication (17)

| Method and path | Access | Description |
|---|---:|---|
| `GET /` | Public | API identity, version and health links. |
| `GET /health` | Public | Process and live database check. |
| `GET /ready` | Public | Readiness payload with database check. |
| `GET /api/v1/health` | Public | Versioned health alias. |
| `GET /api/v1/ready` | Public | Versioned readiness alias. |
| `GET /api/v1/public/app-version/:app` | Public | Current application version and release notes. |
| `POST /api/v1/auth/login` | Public | Credential login, rate limiting, session cookie and CSRF token. |
| `POST /api/v1/auth/logout` | Public | Revoke current cookie session and clear cookie. |
| `GET /api/v1/auth/me` | A/S | Current account, profile/role data and CSRF token. |
| `POST /api/v1/auth/change-password` | A/S | Verify current password, change it and revoke other sessions. |
| `GET /api/v1/auth/sessions` | A/S | List the current user's sessions. |
| `DELETE /api/v1/auth/sessions/:id` | A/S | Revoke an owned non-current session. |
| `GET /api/v1/admin/app-versions` | A | List current versions by application. |
| `PUT /api/v1/admin/app-versions/:app` | A | Update an application's current version. |
| `GET /api/v1/admin/app-releases` | A | List release-note records. |
| `PUT /api/v1/admin/app-releases/:app` | A | Upsert release notes/version metadata. |
| `GET /api/v1/admin/audit` | A | Browse audit log entries with filters. |

### Administration, presence and dashboard (11)

| Method and path | Access | Description |
|---|---:|---|
| `POST /api/v1/presence` | S | Heartbeat current student presence/state. |
| `POST /api/v1/activity` | S | Record a student activity event. |
| `GET /api/v1/dashboard` | S | Student dashboard/plan summary. |
| `GET /api/v1/student/today` | S | Today's student plan, tasks and status. |
| `GET /api/v1/student/progress/weekly` | S | Current student's weekly progress. |
| `GET /api/v1/student/performance/topics` | S | Current student's topic performance. |
| `GET /api/v1/admin/dashboard` | A | Aggregate dashboard metrics and risks. |
| `GET /api/v1/admin/live` | A | Live student/session activity view. |
| `GET /api/v1/admin/activity` | A | Filtered activity feed. |
| `GET /api/v1/admin/attention` | A | Students/items needing attention. |
| `GET /api/v1/admin/realtime/students` | A | Realtime student presence snapshot. |

### Students (12)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/admin/students` | A | Search/filter student accounts. |
| `POST /api/v1/admin/students` | A | Create student and login account. |
| `GET /api/v1/admin/students/:id/overview` | A | Student profile and operational overview. |
| `PATCH /api/v1/admin/students/:id` | A | Update student/account fields. |
| `DELETE /api/v1/admin/students/:id` | A | Archive/delete a student under domain safeguards. |
| `POST /api/v1/admin/students/:id/activate` | A | Activate student account. |
| `POST /api/v1/admin/students/:id/deactivate` | A | Deactivate student account. |
| `POST /api/v1/admin/students/:id/restore` | A | Restore archived student account. |
| `POST /api/v1/admin/students/:id/force-logout` | A | Revoke all student sessions. |
| `POST /api/v1/admin/students/:id/reset-password` | A | Reset password and revoke sessions. |
| `GET /api/v1/admin/students/:id/progress/weekly` | A | Weekly progress for one student. |
| `GET /api/v1/admin/students/:id/performance/topics` | A | Topic performance for one student. |

### Plans, tasks, feedback and study sessions (28)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/plans` | S | Current student's plans in a date range. |
| `GET /api/v1/admin/plans` | A | Student/date-filtered plan list. |
| `POST /api/v1/admin/plans` | A | Create/upsert a plan and tasks. |
| `GET /api/v1/admin/plans/summary` | A | Plan/task summary for a student/range. |
| `POST /api/v1/admin/tasks/batch` | A | Create multiple tasks in one operation. |
| `PATCH /api/v1/admin/plans/:id` | A | Update plan metadata. |
| `DELETE /api/v1/admin/plans/:id` | A | Delete a plan and related work. |
| `POST /api/v1/admin/plans/:id/duplicate` | A | Duplicate plan to another date. |
| `POST /api/v1/admin/plans/:id/tasks` | A | Add a task to a plan. |
| `PATCH /api/v1/admin/tasks/:id` | A | Update an individual task. |
| `DELETE /api/v1/admin/tasks/:id` | A | Delete an individual task. |
| `POST /api/v1/admin/plans/publish-range` | A | Publish/unpublish plans over a date range. |
| `PUT /api/v1/tasks/:id/completion` | S | Upsert owned task completion and feedback. |
| `DELETE /api/v1/tasks/:id/completion` | S | Clear owned task completion. |
| `POST /api/v1/task-issues` | S | Report a task issue. |
| `GET /api/v1/task-issues` | S | List current student's task issues. |
| `GET /api/v1/tasks/:id/comments` | S | List comments for an owned task. |
| `PATCH /api/v1/admin/task-issues/:id` | A | Resolve/update task issue status. |
| `POST /api/v1/admin/comments` | A | Add advisor comment to a task/student. |
| `GET /api/v1/admin/comments` | A | List/filter advisor comments. |
| `GET /api/v1/study-sessions/active` | S | Get current active/paused study session. |
| `POST /api/v1/study-sessions/start` | S | Start study for an owned task. |
| `POST /api/v1/study-sessions/:id/pause` | S | Pause owned study session. |
| `POST /api/v1/study-sessions/:id/resume` | S | Resume owned study session. |
| `POST /api/v1/study-sessions/:id/heartbeat` | S | Persist elapsed time/keep session alive. |
| `POST /api/v1/study-sessions/:id/finish` | S | Finish with duration and feedback. |
| `GET /api/v1/reviews` | S | List due learning reviews. |
| `PATCH /api/v1/reviews/:id` | S | Complete/update a review. |

### Subjects and learning journal (19)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/subjects` | S | List effective subjects for current student. |
| `GET /api/v1/admin/subjects` | A | List global subject catalog. |
| `POST /api/v1/admin/subjects` | A | Create catalog subject. |
| `PATCH /api/v1/admin/subjects/:id` | A | Update/archive catalog subject. |
| `GET /api/v1/admin/student-subjects/:studentId` | A | List student's subject overrides/settings. |
| `PATCH /api/v1/admin/student-subjects/:studentId/:subjectId` | A | Update a student's subject configuration. |
| `GET /api/v1/learning/summary` | S | Learning journal and spaced-review summary. |
| `GET /api/v1/learning/items` | S | List/search own learning items. |
| `POST /api/v1/learning/items` | S | Create own learning item. |
| `PATCH /api/v1/learning/items/:id` | S | Update owned learning item. |
| `DELETE /api/v1/learning/items/:id` | S | Delete owned learning item. |
| `POST /api/v1/learning/items/:id/review` | S | Record review result and reschedule item. |
| `GET /api/v1/learning/items/:id/reviews` | S | Review history for owned item. |
| `GET /api/v1/admin/reviews` | A | View student review workload/results. |
| `GET /api/v1/admin/students/:id/learning` | A | Student learning summary and items. |
| `POST /api/v1/admin/students/:id/learning` | A | Create learning item for student. |
| `PATCH /api/v1/admin/students/:id/learning/:itemId` | A | Update student learning item. |
| `DELETE /api/v1/admin/students/:id/learning/:itemId` | A | Delete student learning item. |
| `GET /api/v1/admin/students/:id/learning/:itemId/reviews` | A | Review history for student item. |

### Exams, syllabus, quizzes and mistakes (32)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/admin/exams` | A | List/filter exams, including student context. |
| `POST /api/v1/admin/exams` | A | Create exam. |
| `PATCH /api/v1/admin/exams/:id` | A | Update exam. |
| `DELETE /api/v1/admin/exams/:id` | A | Delete exam. |
| `POST /api/v1/admin/exams/:id/syllabus` | A | Add syllabus item to exam. |
| `DELETE /api/v1/admin/syllabus/:id` | A | Remove syllabus item. |
| `GET /api/v1/admin/exams/:id/questions` | A | List exam questions. |
| `POST /api/v1/admin/exams/:id/questions` | A | Add exam question. |
| `DELETE /api/v1/admin/exams/:examId/questions/:id` | A | Delete exam question with exam scope. |
| `GET /api/v1/admin/exam-attempt-requests` | A | List exam retry/attempt requests. |
| `PATCH /api/v1/admin/exam-attempt-requests/:id` | A | Approve/reject retry request. |
| `GET /api/v1/admin/quizzes` | A | List quizzes. |
| `POST /api/v1/admin/quizzes` | A | Create quiz. |
| `PATCH /api/v1/admin/quizzes/:id` | A | Update quiz. |
| `GET /api/v1/admin/quizzes/:id/questions` | A | List quiz questions. |
| `POST /api/v1/admin/quizzes/:id/questions` | A | Add quiz question. |
| `PATCH /api/v1/admin/questions/:id` | A | Update question. |
| `DELETE /api/v1/admin/questions/:id` | A | Delete question. |
| `GET /api/v1/admin/students/:studentId/attempts` | A | List student's attempts. |
| `GET /api/v1/admin/students/:studentId/attempts/:attemptId` | A | Inspect one student attempt. |
| `GET /api/v1/exams` | S | List assigned/available exams. |
| `GET /api/v1/exams/:id/progress` | S | Exam progress/attempt status. |
| `POST /api/v1/exams/:id/start` | S | Start an allowed exam attempt. |
| `POST /api/v1/exams/:id/retry-request` | S | Request another attempt. |
| `PUT /api/v1/syllabus/:id/progress` | S | Update own syllabus progress. |
| `GET /api/v1/mistakes` | S | List mistakes from attempts. |
| `PATCH /api/v1/mistakes/:id` | S | Update mistake reason/resolution. |
| `POST /api/v1/quizzes/:id/start` | S | Start timed quiz and receive questions. |
| `GET /api/v1/quizzes/:id` | S | Get available quiz detail. |
| `POST /api/v1/quizzes/:id/attempts` | S | Submit quiz answers and score. |
| `GET /api/v1/quizzes/history/:attemptId` | S | Review owned attempt. |
| `GET /api/v1/quizzes/history` | S | List own quiz attempt history. |

### Reports and recovery (6)

| Method and path | Access | Description |
|---|---:|---|
| `POST /api/v1/reports` | S | Create/update daily report. |
| `GET /api/v1/reports` | S | List own daily reports. |
| `GET /api/v1/admin/reports` | A | Aggregate/filter student reports. |
| `POST /api/v1/recovery-requests` | S | Request plan/task recovery. |
| `GET /api/v1/admin/recovery-requests` | A | List/filter recovery requests. |
| `PATCH /api/v1/admin/recovery-requests/:id` | A | Approve/reject/resolve recovery request. |

### Notifications, push and realtime (10)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/notifications` | A/S | Cursor-paginated user-scoped notifications, unread filter/count. |
| `PUT /api/v1/notifications/:id/read` | A/S | Mark an owned notification read. |
| `PUT /api/v1/notifications/read-all` | A/S | Mark all scoped notifications read. |
| `GET /api/v1/push/config` | A/S | Push availability and VAPID public key. |
| `GET /api/v1/push/status` | A/S | Device registration and preference status. |
| `POST /api/v1/push/subscriptions` | A/S | Register/update browser push subscription. |
| `DELETE /api/v1/push/subscriptions` | A/S | Remove one/all owned subscriptions. |
| `PUT /api/v1/push/preferences` | A/S | Save notification category preferences. |
| `POST /api/v1/push/test` | A/S | Create and send a test notification. |
| `GET /api/v1/events` | A/S | Authenticated, user-scoped SSE stream. |

### Direct and group chat (28)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/chat/conversation` | S | Get/create direct advisor conversation. |
| `GET /api/v1/admin/chat/conversations` | A | List direct student conversations. |
| `GET /api/v1/chat/conversations` | A/S | Paginated direct+group conversation list. |
| `GET /api/v1/chat/conversations/:id` | A/S | Group/conversation details with membership gating. |
| `GET /api/v1/chat/conversations/:id/messages` | A/S | Read accessible messages. |
| `POST /api/v1/chat/conversations/:id/messages` | A/S | Send text/reply under membership permissions. |
| `POST /api/v1/chat/conversations/:id/read` | A/S | Mark conversation read. |
| `PATCH /api/v1/chat/conversations/:id/mute` | A/S | Mute/unmute group for current member. |
| `GET /api/v1/chat/users` | A/S | Search active users for group membership/mentions. |
| `POST /api/v1/chat/groups` | A/S | Create rate-limited group. |
| `GET /api/v1/chat/groups/:id/members` | A/S | List group members. |
| `GET /api/v1/chat/groups/:id/candidates` | A/S | Search eligible members under permissions. |
| `POST /api/v1/chat/groups/:id/members` | A/S | Add member with capacity/RBAC checks. |
| `DELETE /api/v1/chat/groups/:id/members/:userId` | A/S | Remove member under group-role hierarchy. |
| `PATCH /api/v1/chat/groups/:id/members/:userId` | A/S | Change member role (owner-only). |
| `POST /api/v1/chat/groups/:id/transfer-owner` | A/S | Transfer ownership transactionally. |
| `POST /api/v1/chat/groups/:id/leave` | A/S | Leave group; owner must transfer first. |
| `PATCH /api/v1/chat/groups/:id` | A/S | Edit/archive group under management permissions. |
| `PATCH /api/v1/chat/groups/:id/permissions` | A/S | Change group permission switches (owner-only). |
| `PATCH /api/v1/chat/messages/:id` | A/S | Edit accessible owned message under permissions. |
| `DELETE /api/v1/chat/messages/:id` | A/S | Soft-delete message under ownership/moderator rules. |
| `POST /api/v1/chat/messages/:id/reactions` | A/S | Add validated emoji reaction. |
| `DELETE /api/v1/chat/messages/:id/reactions/:emoji` | A/S | Remove own reaction. |
| `POST /api/v1/chat/conversations/:id/share/study-state` | S | Share selected current study metrics snapshot. |
| `POST /api/v1/chat/conversations/:id/share/exam-result` | S | Share an owned exam/quiz result snapshot. |
| `POST /api/v1/chat/conversations/:id/share/study-time` | S | Share bounded study-time summary. |
| `POST /api/v1/chat/conversations/:id/share/current-activity` | S | Share current active study session. |
| `POST /api/v1/chat/conversations/:id/share/learning-item` | S | Share owned learning item snapshot. |

### Import/export and database operations (8)

| Method and path | Access | Description |
|---|---:|---|
| `GET /api/v1/admin/export/json` | A | Export plans/exams as versioned JSON. |
| `GET /api/v1/admin/import/template` | A | Download plan/exam import template. |
| `POST /api/v1/admin/import/preview` | A | Validate and preview import without writing. |
| `POST /api/v1/admin/import/commit` | A | Transactionally commit validated import. |
| `GET /api/v1/admin/import/history` | A | Browse prior import audit/history. |
| `GET /api/v1/admin/system/database` | A | Database metadata/health/backup inventory. |
| `POST /api/v1/admin/system/database-backup` | A | Produce validated SQLite backup download. |
| `POST /api/v1/admin/system/database-restore` | A | Validate, snapshot and atomically install SQLite upload. |

## Complete v2 endpoint inventory

All application routes below are under `/api/v2`. A/S routes require the v2 session cookie; authenticated mutations require CSRF. Paths marked **placeholder** exist but do not implement a real domain result.

### Public/system and auth (8)

| Method and path | Access | Description |
|---|---:|---|
| `GET /health` | Public | Process health only. |
| `GET /ready` | Public | Returns constant `{database:"ready"}`; no DB query. |
| `POST /auth/login` | Public | Login and set v2 cookie/CSRF token. |
| `GET /auth/me` | Auth | Current account and CSRF token. |
| `POST /auth/change-password` | Auth | Change password and revoke other sessions. |
| `POST /auth/logout` | Public | Revoke current session cookie if present. |
| `GET /auth/sessions` | Auth | List own sessions. |
| `DELETE /auth/sessions/:id` | Auth | Revoke owned non-current session. |

### Admin/students/plans/import (34)

| Method and path | Access | Description |
|---|---:|---|
| `GET /admin/dashboard` | A | **Placeholder:** returns empty metric arrays. |
| `GET /admin/students` | A | List students. |
| `GET /admin/students/:id` | A | Get student. |
| `POST /admin/students` | A | Create student; body lacks DTO validation. |
| `PATCH /admin/students/:id` | A | Update student; body lacks DTO validation. |
| `DELETE /admin/students/:id` | A | Archive student. |
| `POST /admin/students/:id/reset-password` | A | Reset password and revoke sessions; primitive body validation only. |
| `POST /admin/students/:id/:action` | A | Activate/deactivate/restore/force-logout via wildcard action. |
| `GET /admin/students/:id/progress/weekly` | A | Weekly plan completion. |
| `GET /admin/students/:id/performance/topics` | A | Topic mastery summary. |
| `GET /admin/students/:id/learning` | A | Student learning items/summary. |
| `POST /admin/students/:id/learning` | A | Create learning item; weak body validation. |
| `PATCH /admin/students/:id/learning/:itemId` | A | Update learning item; weak body validation. |
| `DELETE /admin/students/:id/learning/:itemId` | A | Delete learning item. |
| `GET /admin/students/:id/learning/:itemId/reviews` | A | Learning review history. |
| `GET /admin/students/:id/analytics` | A | Student dashboard-derived analytics, not full analytics. |
| `GET /admin/students/:id/overview` | A | Same dashboard-derived payload as analytics. |
| `GET /admin/advisor-inbox` | A | **Placeholder:** returns empty arrays. |
| `GET /admin/reports` | A | **Placeholder:** returns a synthetic empty summary row. |
| `GET /admin/plans` | A | List plans for required `studentId` and date range. |
| `POST /admin/plans` | A | Upsert plan/tasks via import DTO. |
| `PATCH /admin/plans/:id` | A | Update plan; partial DTO validation is not applied at runtime. |
| `DELETE /admin/plans/:id` | A | Delete plan. |
| `POST /admin/plans/:id/duplicate` | A | Duplicate plan to `planDate`. |
| `POST /admin/plans/:id/tasks` | A | Add task; nested DTO type is not a concrete runtime DTO here. |
| `PATCH /admin/tasks/:id` | A | Update/move task; body not runtime DTO-validated. |
| `DELETE /admin/tasks/:id` | A | Delete task. |
| `POST /admin/plans/publish-range` | A | Publish/unpublish a student's plans by date range. |
| `POST /admin/plans/import` | A | Import one plan. |
| `POST /admin/plans/import/preview` | A | Preview one plan import. |
| `POST /admin/import/preview` | A | Preview generic payload; currently always reports valid after coercion. |
| `POST /admin/import/commit` | A | Commit generic payload; only plan data is committed. |
| `POST /admin/recommendations` | A | **Placeholder:** echoes input as accepted. |
| `GET /students/me` | S | Current student's public record. |

### Student dashboard, learning and aliases (12)

| Method and path | Access | Description |
|---|---:|---|
| `GET /student/dashboard` | S | Student dashboard summary. |
| `GET /student/today` | S | Today's plan/tasks. |
| `GET /student/plans?date=` | S | Plan array for one date. |
| `GET /student/progress` | S | Weekly-style progress payload. |
| `GET /student/progress/weekly` | S | Alias of the same progress calculation. |
| `GET /progress/weekly` | S | Compatibility alias. |
| `GET /student/reviews` | S | Due learning items presented as reviews. |
| `GET /reviews` | S | Compatibility alias. |
| `GET /student/learning/summary` | S | Learning summary with placeholder exam/mistake metrics. |
| `GET /learning/summary` | S | Compatibility alias. |
| `GET /student/learning/items` | S | Read own learning items. |
| `GET /learning/items` | S | Compatibility alias. |

### Exams, questions and attempts (19)

| Method and path | Access | Description |
|---|---:|---|
| `GET /student/exams` | S | List published exams; assignment scoping is absent. |
| `GET /student/exams/:id` | S | Exam detail/questions for student. |
| `GET /student/exams/:id/progress` | S | Current attempt/progress. |
| `POST /student/exams/:id/start` | S | Start/resume allowed attempt. |
| `PATCH /student/exams/attempts/:id` | S | Autosave attempt answers. |
| `POST /student/exams/:id/submit` | S | Submit/score attempt. |
| `GET /student/exams/attempts` | S | Own attempt history. |
| `GET /admin/exams` | A | List all exams; supplied `studentId` is ignored. |
| `POST /admin/exams` | A | Create exam/questions. |
| `PATCH /admin/exams/:id` | A | Update exam with weak body validation. |
| `DELETE /admin/exams/:id` | A | Delete exam. |
| `GET /admin/exams/:id/questions` | A | List exam questions. |
| `POST /admin/exams/:id/questions` | A | Add question. |
| `PATCH /admin/questions/:id` | A | Update question with weak body validation. |
| `DELETE /admin/questions/:id` | A | Delete question. |
| `DELETE /admin/exams/:examId/questions/:id` | A | Scoped delete alias. |
| `GET /admin/students/:studentId/attempts` | A | Student attempt history. |
| `GET /admin/students/:studentId/attempts/:attemptId` | A | One student attempt detail. |
| `POST /admin/questions/import` | A | Bulk-import questions into exam. |

### Tasks and study sessions (10)

| Method and path | Access | Description |
|---|---:|---|
| `GET /student/tasks/:id` | S | Owned task with comments/issues. |
| `POST /student/tasks/:id/complete` | S | Mark task done/partial/skipped; some feedback is not persisted. |
| `POST /student/tasks/:id/comments` | S | Add own task comment. |
| `POST /student/tasks/:id/issues` | S | Report own task issue. |
| `POST /student/study-sessions` | S | Start study on owned task. |
| `GET /student/study-sessions/active` | S | Get active session. |
| `POST /student/study-sessions/:id/heartbeat` | S | Persist elapsed time. |
| `POST /student/study-sessions/:id/pause` | S | Pause session. |
| `POST /student/study-sessions/:id/resume` | S | Resume session. |
| `POST /student/study-sessions/:id/finish` | S | Finish and persist feedback. |

### Chat, notifications, reports, mistakes, realtime and sync (21)

| Method and path | Access | Description |
|---|---:|---|
| `GET /admin/chat/conversations` | A | List one-to-one student conversations. |
| `GET /chat/conversations` | S | Student's advisor conversation. |
| `GET /chat/conversations/:id/messages` | A/S | Read direct messages after peer resolution. |
| `POST /chat/conversations/:id/messages` | A/S | Send plain-text direct message. |
| `POST /chat/conversations/:id/read` | A/S | Mark peer messages read. |
| `GET /notifications` | S | List latest own notifications; no cursor/filter/hasMore. |
| `PUT /notifications/:id/read` | S | Mark owned notification read. |
| `PUT /notifications/read-all` | S | Mark all own notifications read. |
| `POST /reports` | S | Save daily report. |
| `GET /reports` | S | List own reports. |
| `POST /recovery-requests` | S | Create recovery request. |
| `GET /recovery-requests` | S | List own recovery requests (new relative to v1). |
| `GET /mistakes` | S | List own mistakes. |
| `GET /mistakes/:id` | S | Get owned mistake detail. |
| `PATCH /mistakes/:id` | S | Update owned mistake. |
| `GET /student/mistakes` | S | Alias of mistake list. |
| `GET /student/mistakes/:id` | S | Alias of mistake detail. |
| `PATCH /student/mistakes/:id` | S | Alias of mistake update. |
| `GET /events` | No role decorator | SSE stream; currently global/unscoped. |
| `GET /sync` | S | Pull plans/tasks/sessions/attempts/notifications. |
| `POST /sync/upload` | S | Idempotent upload for task completion/study-session mutations only. |

## Route totals

The inventory yields **172 concrete v1 routes** and **104 concrete v2 routes**. V2's total counts each of the two controller prefixes for the three mistake methods as a distinct HTTP route. For durable release gating, both backends should publish OpenAPI documents or deterministic framework route dumps and compare those generated artifacts in CI.

## Prioritized v2 work

### P0 — security and data isolation

1. Scope SSE by authenticated user/role; do not publish a process-wide event bus to every connected client.
2. Add persistent login throttling/lockout equivalent to v1.
3. Add student assignment to exams and enforce it in list/detail/start/submit/admin filtering.
4. Replace raw admin bodies with concrete DTOs and domain validation; fix `@Max` used on strings in `FinishStudySessionDto`.
5. Persist every task-completion field that the API claims to save, or remove it from the contract.
6. Add systematic mutation audit events and an admin audit endpoint.

### P1 — false-parity endpoints

1. Implement real admin dashboard, advisor inbox, reports, analytics and recommendations.
2. Make generic import preview honest, commit plans+exams transactionally, preserve links/IDs safely, and add export/template/history.
3. Implement admin recovery moderation and student learning mutation/review workflows.
4. Make readiness query the database.
5. Add cursor pagination/filtering and admin support to notifications.

### P2 — missing product domains

1. Subjects and student-subject configuration.
2. Web Push subscriptions/preferences/test delivery.
3. Group chat and its member-level RBAC/rich message features.
4. Presence/activity/live monitoring.
5. Quiz/syllabus/retry-request workflows.
6. App version/release management and database backup/restore.

## Verification and limitations

- Inventories were derived from current `router.add(...)` registrations, generated `shareRoute(...)` registrations, Nest controller decorators, and the global v2 prefix.
- Service implementations, DTOs, guards, entities and migrations were inspected for behavior and parity—not only route names.
- Existing `graphify-out` was queried first, but it pointed primarily to older `backend/` paths and was treated as stale navigation evidence rather than source of truth.
- No production database or destructive restore was used.
- Browser, native/Tauri, and deployed behavior are outside this API-source audit.
