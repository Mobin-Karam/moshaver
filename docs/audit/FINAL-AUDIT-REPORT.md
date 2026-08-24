# Moshaver v1.4 Architecture Audit

Date: 2026-08-24  
Scope: `v1.4/backend`, `v1.4/admin-app`, `v1.4/student-app`  
Mode: read-only source audit plus local backend validation

## Executive Summary

Moshaver v1.4 is a compact, dependency-light application: a Node 22 HTTP API backed by SQLite, plus two static Persian RTL PWAs for advisor/admin and student users. The codebase is small enough to reason about directly, and the current backend validation is healthy: syntax checks and the smoke suite both pass.

The main architectural strength is its low operational complexity. Authentication, CSRF, sessions, rate limits, audit logs, SSE, plans, exams, chat, study tracking, reports, imports, and notifications all live in one deployable backend with no external broker or ORM. That is suitable for a single-advisor/small-cohort product.

The main architectural risk is that the product has outgrown a single 4,500+ line backend file and large imperative frontend scripts. The current design can continue to work, but future changes will become risky unless route groups, schema migrations, import validation, exam delivery, and frontend view logic are separated into clearer modules with focused tests.

## Validation Performed

- `npm run check` in `v1.4/backend`: passed.
- `npm run smoke` in `v1.4/backend`: passed.
- Smoke coverage reported by the script: stable CSRF, reliable logout, secure cookies, CORS, rate limit, JSON import, study/report integrity, chat plus SSE, sessions, and activity validation.
- Runtime observed by smoke: Node `v22.12.0`, backend version `1.4.2`, temporary SQLite database under `v1.4/backend/data`.

No application source files were modified by this audit.

## System Shape

### Backend

- Entrypoint: `v1.4/backend/src/server.js`.
- Runtime: Node `>=22.5.0 <23` using experimental `node:sqlite`.
- HTTP layer: native `http`, custom regex router in `src/router.js`.
- Persistence: SQLite through `DatabaseSync` in `src/db.js`.
- Security: `src/security.js` uses scrypt password hashes, token hashing, random session/CSRF tokens, and timing-safe comparisons.
- Realtime: `src/realtime.js` stores events in SQLite and fans out Server-Sent Events to connected clients.

### Frontends

- Admin app: static PWA under `v1.4/admin-app`, main script `js/admin.js`, API client `js/api.js`.
- Student app: static PWA under `v1.4/student-app`, main script `js/app.js`, API client `js/api.js`.
- Both frontends use cookie authentication with `withCredentials`, session-scoped CSRF tokens, service workers, and nginx Docker images.

### Data Model

The schema is initialized and evolved in `v1.4/backend/src/db.js`. Major domains:

- Identity: `users`, `students`, `sessions`, `auth_rate_limits`.
- Planning: `plans`, `tasks`, `task_completions`, `daily_reports`, `study_sessions`.
- Exams: `exams`, `exam_syllabus`, `quizzes`, `quiz_questions`, `quiz_runs`, `quiz_attempts`, `quiz_answers`, `exam_attempt_requests`.
- Coaching workflow: `subjects`, `student_subjects`, `syllabus_progress`, `review_items`, `recovery_requests`, `task_issues`, `advisor_comments`.
- Communication: `chat_conversations`, `chat_messages`, `chat_reads`, `notifications`, `realtime_events`.
- Operations: `audit_logs`, `app_versions`, `app_releases`, `data_imports`.

## Key Strengths

- Very low dependency and deployment surface.
- Production config rejects missing default production passwords and CORS origins.
- Cookie sessions are HttpOnly, SameSite-aware, and Secure in production by default.
- Mutating cookie-authenticated requests require CSRF tokens, with client-side refresh/retry behavior.
- Login throttling persists in SQLite and is covered by smoke tests.
- SSE events are durable enough for reconnect replay through `Last-Event-ID`.
- The backend has pragmatic health and readiness endpoints.
- The smoke suite exercises important full-stack API behavior, not just syntax.
- Persian RTL UX is purpose-built for the product rather than generic translated UI.

## Findings

### Partially Addressed After Audit: `server.js` is too large for safe feature velocity

`v1.4/backend/src/server.js` contains routing, auth/session helpers, validation, query composition, business rules, import logic, exam flow, chat, SSE wiring, audit logging, and server lifecycle in one file. The route list spans roughly lines 1539-4590.

Risk: changes in one domain can regress another domain because helpers and state are shared implicitly. Reviews, tests, and conflict resolution become harder as features grow.

Progress: root, health, readiness, and public app-version endpoints now live in `v1.4/backend/src/routes/system.routes.js`; auth/session endpoints now live in `v1.4/backend/src/routes/auth.routes.js`; the SSE endpoint now lives in `v1.4/backend/src/routes/realtime.routes.js`; student notification list/read endpoints now live in `v1.4/backend/src/routes/notifications.routes.js`; student/admin subject endpoints now live in `v1.4/backend/src/routes/subjects.routes.js`; admin JSON import endpoints now live in `v1.4/backend/src/routes/imports.routes.js`; admin dashboard/live/activity/inbox/app-version/audit endpoints now live in `v1.4/backend/src/routes/admin.routes.js`; student/admin chat endpoints now live in `v1.4/backend/src/routes/chat.routes.js`; student/admin report endpoints now live in `v1.4/backend/src/routes/reports.routes.js`; study-session endpoints now live in `v1.4/backend/src/routes/study.routes.js`; student presence/activity endpoints now live in `v1.4/backend/src/routes/activity.routes.js`; review endpoints now live in `v1.4/backend/src/routes/reviews.routes.js`; task completion/issues/advisor comment endpoints now live in `v1.4/backend/src/routes/tasks.routes.js`; admin student management endpoints now live in `v1.4/backend/src/routes/students.routes.js`; student dashboard plus student/admin plan/task endpoints now live in `v1.4/backend/src/routes/plans.routes.js`; student/admin exam and quiz endpoints now live in `v1.4/backend/src/routes/exams.routes.js`; and recovery request endpoints now live in `v1.4/backend/src/routes/recovery.routes.js`, establishing the route-module pattern. Auth behavior lives behind `v1.4/backend/src/services/auth.service.js`, realtime emit/presence/activity/notification helpers live behind `v1.4/backend/src/services/activity.service.js`, chat conversation/read/list helpers live behind `v1.4/backend/src/services/chat.service.js`, import normalization lives in `v1.4/backend/src/validation/imports.validation.js`, import commit persistence lives behind `v1.4/backend/src/services/import.service.js`, student dashboard assembly, plan mapping/metrics, student/admin plan reads, and admin plan/task mutations live behind `v1.4/backend/src/services/plans.service.js`, admin exam CRUD/syllabus/question/retry-review operations, admin quiz list/create/update/question management, student exam list/progress/start/retry-request, syllabus progress, quiz-run start/resume, quiz payload, quiz-attempt scoring/submission/history, mistake-list, and mistake-update behavior live behind `v1.4/backend/src/services/exams.service.js`, and auth/import payload checks now live in `v1.4/backend/src/validation/`, establishing the route-to-validation-to-service pattern.

Recommendation: split by domain without changing behavior first:

- `auth.routes.js`
- `student.routes.js`
- `admin.routes.js`
- `exam.routes.js`
- `chat.routes.js`
- `import.routes.js`
- `services/audit.js`
- `services/exam-access.js`
- `services/realtime-events.js`

### Resolved After Audit: Schema migration strategy was implicit

Initial audit finding: `db.js` used `CREATE TABLE IF NOT EXISTS` plus `ensureColumn` additive migrations, with no ordered migration history beyond the unused `schema_migrations` table.

Resolution: schema setup now runs through `v1.4/backend/src/migrations/index.js`, with numbered migration modules and applied versions recorded in `schema_migrations`.

Remaining caveat: future non-additive migrations still need careful backup and compatibility planning.

### Resolved After Audit: Docker backend database path was misnamed

Initial audit finding: `v1.4/backend/Dockerfile` set `DATABASE_PATH=/data/konkur.sqlite` while the app is Moshaver and the default local path is `data/moshaver.sqlite`.

Resolution: the Docker default was updated to `/data/moshaver.sqlite` during the first modernization pass.

Deployment caveat: confirm production volumes before deploying this change if any existing container persisted data under the old filename.

### Medium: Experimental SQLite runtime pins the app to a narrow Node range

The backend depends on `node:sqlite` and starts with `--experimental-sqlite`. `package.json` requires Node `>=22.5.0 <23`, and the smoke run used Node `v22.12.0`.

Risk: runtime behavior can change across Node point releases while the API remains experimental.

Recommendation: keep the pin strict, document the exact deployed Node version, and consider a stable SQLite binding if the app needs longer-term production hardening.

### Medium: Frontend scripts are large imperative modules

`admin-app/js/admin.js` and `student-app/js/app.js` contain substantial DOM rendering, state, API orchestration, modal logic, and event handling in single files.

Risk: UI behavior is hard to isolate and test. Rendering strings with many inline event bindings increases regression risk.

Recommendation: split into feature modules while preserving static delivery:

- `views/chat.js`
- `views/planner.js`
- `views/exams.js`
- `views/profile.js`
- `components/modal.js`
- `components/toast.js`
- `state/session.js`

Progress: both static apps now expose a small shared CSS token baseline for spacing, radius, and font sizes. Shared DOM/query/escape/Persian-number/icon helpers and a DOM-based safe toast component live in `v1.4/frontend-shared/ui-utils.js` and are shipped as static copies to both PWAs. `admin-app/js/` and `student-app/js/` now have `core/`, `views/`, `components/`, and `utils/` extraction targets. `npm run check` verifies the shared JavaScript copies, service-worker references, HTML references, frontend module directories, toast delegation, and required CSS token names.

### Medium: Security posture is good, but CSP is absent

The backend sets several security headers for API responses. Static frontend nginx configuration was not observed enforcing a Content Security Policy.

Risk: the frontend uses dynamic HTML assembly in many places. Escaping helpers are present in UI code, but a CSP would reduce blast radius if an injection bug lands.

Recommendation: add a static-app CSP in nginx, then fix any violations explicitly. Start with a report-only policy if deployment risk is high.

### Medium: Realtime event retention is cleanup-dependent

`realtime_events` provides durable replay, and `EVENT_RETENTION_HOURS` defaults to 72. The audit found retention settings and cleanup support, but operational scheduling of cleanup should be confirmed in deployment.

Risk: long-running deployments may accumulate events if cleanup is not called consistently.

Recommendation: document the cleanup lifecycle and add a smoke/assertion for retention cleanup behavior.

### Medium: Import and exam delivery deserve deeper dedicated tests

The smoke suite covers JSON import and exam-related behavior, but import and exam delivery are complex domains: replace-existing semantics, plan conflicts, question correctness, retries, active quiz runs, retry windows, and published/open/closed states.

Risk: edge cases can silently corrupt student-facing plans or exam attempts.

Recommendation: add fixture-based tests for import preview/commit and exam access calculations.

### Resolved After Audit: Admin and student API clients were duplicated

Initial audit finding: `admin-app/js/api.js` and `student-app/js/api.js` were near-identical, with different CSRF storage keys and SSE event lists.

Resolution: shared request, CSRF, error, abort, and SSE handling now lives in `v1.4/frontend-shared/api-client.js`. Each app ships a static copy at `js/api-client.shared.js`, and `js/api.js` is now a thin app-specific wrapper. Shared UI primitives and the safe toast component now live in `v1.4/frontend-shared/ui-utils.js`, shipped as `js/ui-utils.shared.js` in both apps.

Follow-up guardrail: `npm run check` now runs `v1.4/scripts/check-frontend-shared.js` to verify the static copies match the canonical source and both apps reference the shared asset.

## Security Review

Positive findings:

- Passwords are hashed with scrypt v2 parameters.
- Legacy scrypt hashes can be verified and rehashed.
- Session tokens and CSRF tokens are random and stored hashed where appropriate.
- Cookies are HttpOnly and SameSite controlled.
- Production mode rejects placeholder credentials.
- Login rate limit state is persisted.
- API responses set no-store caching.
- Role checks are part of route declarations.
- A lightweight permission module, relationship tables, and `v1.4/backend/scripts/authorization-test.js` now prepare and test advisor, teacher, guardian, student, and admin access boundaries.

Watch items:

- Confirm frontend CSP at nginx/static layer.
- Confirm production `COOKIE_SAMESITE=None` is only used with `COOKIE_SECURE=true` if cross-site embedding is required.
- Confirm CORS origins are exact production origins and do not use `*` with credentials.
- Review admin audit coverage for every destructive or sensitive admin mutation.
- Future-role routes must use relationship-aware authorization server-side; frontend hiding is not sufficient.

## UX Review

The product is explicitly designed for Persian RTL coaching workflows. The admin app focuses on daily action, chat, exams, live activity, planner, reports, subjects, and system controls. The student app focuses on today/current task, focus mode, plan, reports, exams, chat, notifications, reviews, and account security.

Main UX risk is maintainability, not apparent missing functionality: the UI is feature-dense and implemented in large handwritten render strings. Browser-visible regression checks should become part of every UI change, especially for mobile RTL layouts, modal flows, chat scrolling, and exam flows.

## Deployment Review

- Backend Docker image is simple and suitable for the dependency-light architecture.
- Static apps use nginx images with entrypoint-based config support.
- Backend healthcheck calls `/health`.
- Backend runs as non-root `node`.
- Backend volume is `/data`.

Deployment caveats:

- `DATABASE_PATH=/data/moshaver.sqlite` should be matched to the production volume and backup plan.
- Node 22.12.0 or the exact tested Node 22 line should be pinned in deployment.
- The SQLite file and WAL sidecar files must be backed up together.
- Static app `config.js` and entrypoint-generated API base URL must be verified per environment.

## Recommended Roadmap

1. Documentation and guardrails: record deploy topology, environment variables, database backup/restore, and release procedure.
2. Backend modularization: split routes and services with no behavior changes.
3. Test expansion: add fixture tests for imports, exam access, retries, and report/study session edge cases.
4. Frontend modularization: extract shared API client and split large view scripts.
5. Browser regression pass: Playwright smoke for admin login, student login, chat, plan completion, report submit, exam start/submit, and mobile layout.
6. Security hardening: CSP, audit coverage review, and deployment CORS/cookie validation.

## Final Assessment

Moshaver v1.4 is operationally coherent and currently validates successfully. It is a strong small-product architecture, but it is approaching the point where single-file backend and frontend modules will slow safe development. The next engineering phase should prioritize modularization, explicit migrations, focused domain tests, and browser-visible regression checks before adding large new features.
