# Moshaver v1.4 AI Context

Use this file as quick context for future implementation agents working on `v1.4`.

## Project Layout

- `v1.4/backend`: Node 22 API, SQLite persistence, no framework.
- `v1.4/admin-app`: static advisor/admin PWA.
- `v1.4/student-app`: static student PWA.
- `docs/audit/FINAL-AUDIT-REPORT.md`: architecture audit generated on 2026-08-24.

## Backend Commands

Run from `v1.4/backend`:

```bash
npm run check
npm run check:frontend
npm run smoke
npm run dev
```

The backend requires Node `>=22.5.0 <23` and runs with `--experimental-sqlite`.

## Backend Architecture

- Entrypoint: `src/server.js`.
- Router: `src/router.js`, regex route matcher.
- Route modules:
  - `src/routes/system.routes.js` registers root, health, readiness, and public app-version endpoints.
  - `src/routes/auth.routes.js` registers login, logout, current user, password change, and session management endpoints.
  - `src/routes/realtime.routes.js` registers the authenticated SSE endpoint.
  - `src/routes/notifications.routes.js` registers student notification list/read endpoints.
  - `src/routes/subjects.routes.js` registers student subject lookup and admin subject/student-subject endpoints.
  - `src/routes/imports.routes.js` registers admin JSON import template, preview, commit, and history endpoints.
  - `src/routes/admin.routes.js` registers admin dashboard, live/activity/inbox, app version/release, and audit endpoints.
  - `src/routes/chat.routes.js` registers student/admin chat conversation, message, read receipt, and admin chat list endpoints.
  - `src/routes/reports.routes.js` registers student daily report submit/list and admin report list endpoints.
  - `src/routes/study.routes.js` registers student active/start/heartbeat/finish study-session endpoints.
  - `src/routes/activity.routes.js` registers student presence and activity event endpoints.
  - `src/routes/reviews.routes.js` registers student review list/update and admin review list endpoints.
  - `src/routes/tasks.routes.js` registers student task completion/issues/comments and admin task issue/advisor comment endpoints.
  - `src/routes/students.routes.js` registers admin student list/create/update/reset-password and overview endpoints.
  - `src/routes/plans.routes.js` registers student dashboard, student published plan reads, and admin plan/task endpoints.
  - `src/routes/exams.routes.js` registers student and admin exam, syllabus, mistake, retry-request, quiz, and question endpoints.
  - `src/routes/recovery.routes.js` registers student recovery requests and admin recovery review endpoints.
- Database/schema/seed: `src/db.js`.
- Migrations: `src/migrations/index.js` runs numbered migration modules and records applied versions in `schema_migrations`.
- Environment: `src/env.js`.
- Security helpers: `src/security.js`.
- Permission helpers: `src/permissions.js`.
- Authorization isolation regression: `scripts/authorization-test.js` validates role permission mapping and student relationship boundaries for admin, student, advisor, teacher, and guardian users. It is run by `npm run check`.
- Auth service: `src/services/auth.service.js` owns login, logout, password change, and session database operations behind `auth.routes.js`.
- Activity service: `src/services/activity.service.js` owns realtime admin/student emit wrappers, student notifications, presence touch/read helpers, active study-session mapping, activity logging, and activity row mapping behind the route modules that need them.
- Chat service: `src/services/chat.service.js` owns conversation creation/access checks, read tracking, message mapping, message list, unread count, and admin conversation list helpers behind `chat.routes.js`.
- Plan service: `src/services/plans.service.js` owns student dashboard assembly, plan mapping/metrics, student/admin plan reads, and admin plan/task mutations behind `plans.routes.js`.
- Exam service: `src/services/exams.service.js` owns admin exam CRUD/syllabus/question/retry-review operations, admin quiz list/create/update/question management, student exam list/progress/start/retry-request, syllabus progress, quiz-run start/resume, quiz payload, quiz-attempt scoring/submission/history, mistake-list, and mistake-update behavior behind `exams.routes.js`.
- Import service: `src/services/import.service.js` owns import commit persistence, notifications, audit logging, and conflict mapping behind `imports.routes.js`.
- Auth validation: `src/validation/auth.validation.js` validates login and password-change payloads before `auth.service.js`.
- Import validation: `src/validation/imports.validation.js` owns import preview/commit normalization and option parsing before import commit.
- Realtime SSE: `src/realtime.js`.

The backend is intentionally dependency-light. Prefer small local modules over introducing a framework unless the user explicitly asks for a larger migration.

## Frontend Architecture

- Admin main script: `admin-app/js/admin.js`.
- Student main script: `student-app/js/app.js`.
- Shared API client source: `frontend-shared/api-client.js`.
- Shared UI utility source: `frontend-shared/ui-utils.js`.
- Static deploy copies: `admin-app/js/api-client.shared.js`, `student-app/js/api-client.shared.js`, `admin-app/js/ui-utils.shared.js`, and `student-app/js/ui-utils.shared.js`.
- Frontend extraction targets: both `admin-app/js/` and `student-app/js/` contain `core/`, `views/`, `components/`, and `utils/` directories for incremental vanilla-JS modularization.
- Safe shared toast rendering: `MoshaverUI.toast()` builds DOM nodes and writes message text with `textContent`; app-level `toast()` wrappers delegate to it.
- App-specific API wrappers: `admin-app/js/api.js` and `student-app/js/api.js` configure CSRF storage keys and SSE event names.
- Design tokens: both `admin-app/css/admin.css` and `student-app/css/app.css` define common spacing, radius, and font-size tokens under `:root`.
- Both clients use cookies with `withCredentials` and send `X-CSRF-Token` for mutating requests.
- Static apps are served by nginx in Docker and configured through `config.js`/entrypoint templates.

## Important Domains

- Auth/session/CSRF/login rate limit.
- Future roles: `admin`, `advisor`, `teacher`, `student`, `guardian`.
- Relationship isolation tables: `advisor_students`, `teacher_students`, `student_guardians`.
- Student plans, tasks, task completions, daily reports, study sessions.
- Exam schedule, syllabus, quizzes, runs, attempts, retry requests.
- Admin JSON import preview/commit.
- Chat, read receipts, notifications, and SSE events.
- Student presence, activity events, recovery requests, task issues, advisor comments.

## Current Verified State

On 2026-08-24:

- `npm run check` passed.
- `npm run smoke` passed.
- Smoke output reported stable CSRF, logout, secure cookies, CORS, rate-limit, JSON import, study/report integrity, chat plus SSE, sessions, and activity validation.

## Known Risks

- `src/server.js` is too large and should be split by domain before heavy feature work.
- Future schema changes should be added as new numbered modules under `src/migrations/` and registered in `src/migrations/index.js`.
- Current routes still mostly declare `admin`/`student` role arrays; future-role endpoints must add server-side permission checks and relationship checks through `src/permissions.js`.
- Backend Dockerfile uses `DATABASE_PATH=/data/moshaver.sqlite`; verify production volumes before deployment if an older container used the previous filename.
- Frontend view scripts are large imperative files; browser test every UI change.
- CSP should be added at the static/nginx layer.

## Editing Guidance

- Keep changes narrow and preserve the dependency-light style.
- New backend route groups should follow the `src/routes/*.routes.js` registration pattern and receive only the dependencies they need.
- Keep route modules thin: validate HTTP input through `src/validation/*.validation.js`, then delegate database/business work to `src/services/*.service.js`.
- Do not reset or rewrite the legacy/student app without explicit user approval.
- Run `npm run check` and `npm run smoke` after backend changes.
- For visible UI work, run the local apps and inspect in a browser/mobile viewport.
- When editing `frontend-shared/api-client.js`, sync the deploy copies in both static apps and verify they match.
- Reuse the CSS token baseline before adding new hard-coded spacing, radius, or type-size values.
- `npm run check` now includes `v1.4/scripts/check-frontend-shared.js`, which validates the shared API client copies, static references, and CSS token baseline.
- Be careful with production database files and `.env` values; do not expose secrets.
