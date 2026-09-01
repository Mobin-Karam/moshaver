<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Legacy-to-v2 Migration](./student-app-v1-to-v2-migration-audit.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student v2 Plan](./student-app-v2-implementation-plan.md)
<!-- DOCS_NAV_END -->
# Student App v1.4 to v2 Migration Audit

Date: 2026-09-01

## Executive Decision

`v1.4/student-app/` is the current feature baseline. `student-app-v2/` is a React/Vite/Tauri replacement foundation, not a drop-in replacement. Do not retire the legacy student app or route production users to v2 until the parity gates in this document pass.

Implementation update (2026-09-01): the first study-session vertical slice is now implemented. `backend-v2` has authenticated student-scoped study-session persistence and `student-app-v2` calls it for active-session restore, start, pause, resume, and finish before task completion. The local session record is retained as a restart fallback, but it is not yet part of the durable sync queue.

Migration update (2026-09-01): task detail/comments/issues, exam progress/attempt persistence, chat discovery/read state, notifications, progress/reviews, password/session management, and the first offline sync worker are now implemented in v2. These changes are staged migration work; legacy replacement is still blocked by the unsupported report/recovery flows, full focus parity, push/update parity, and production-grade sync conflict handling listed below.

Branch update (2026-09-01): all current student migration and backend implementation changes are preserved on `feat/student-v1-to-v2-migration`. The branch includes the report/recovery data model and student endpoints, with the client forms submitting to those endpoints and retaining drafts when submission fails.

The migration is a client rewrite plus an API-contract migration:

- Legacy client: static HTML, JavaScript, CSS, PWA/service worker, `/api/v1`.
- Target client: React, TypeScript, Vite, React Router, Zustand, Tauri v2, SQLite, `/api/v2`.
- Shared target domain logic: `student-core/`.
- Target server: `backend-v2/`, NestJS/Fastify/TypeORM with SQLite currently configured.

## 1. Purpose and Locations

### Legacy application

Location: `v1.4/student-app/`

The HTML shell and all visible screens are assembled in `index.html`. Runtime behavior is concentrated in `js/app.js`, with shared API behavior in `js/api-client.shared.js`, notifications in `js/notification-*.js`, push support in `js/push-client.js`, and update behavior in `js/update.js`.

Dependencies include browser DOM APIs, `localStorage`, `EventSource`, service workers, Web Push, and the v1 backend. The app has no package manifest in this directory; its deployment/runtime scripts are `local-server.js`, `run-local-student.sh`, and the Docker/nginx files.

### Target application

Location: `student-app-v2/`

`src/main.tsx` owns routing, authentication presentation, the shell, and bottom navigation. Feature pages are under `src/features/`. `src/services/student-store.ts` owns auth, dashboard, plan, exam list, and task state. `src/services/api-client.ts` owns cookie-based HTTP and CSRF headers. `src/native/tauri-sqlite-provider.ts` and `src/sync/sqlite-sync-provider.ts` provide persistence/queue primitives. `src-tauri/tauri.conf.json` defines the desktop bundle and Android minimum SDK 24.

Dependencies include React 18, React Router, Zustand, Lucide, Vite, Tauri v2, Tauri SQL, and the local `@moshaver/student-core` package.

### Backend contract owners

- Legacy routes: `v1.4/backend/src/routes/` and services under `v1.4/backend/src/services/`.
- Target routes: `backend-v2/src/modules/`, especially `auth`, `students`, `exams`, `chat`, `realtime`, and `sync`.
- Target API prefix is configured by the backend bootstrap and consumed by the client as `/api/v2` by default.

## 2. Relationships and Data Flow

Legacy flow:

`index.html` -> global `state` in `js/app.js` -> `API` in `js/api.js` -> v1 endpoints -> browser `localStorage`/service worker for drafts, queued writes, notifications, and updates.

Target flow:

`main.tsx` -> feature page -> Zustand `student-store` or `api-client` -> v2 controller/service -> TypeORM entities. Tauri persistence is currently reachable through provider classes, but the feature store does not yet connect those providers to normal reads and writes.

The target API uses `{ ok, data, error }` envelopes. The target client sends cookies with `credentials: 'include'` and stores the CSRF token in `localStorage`. This is compatible with the current v2 auth controller, but token/session expiry, offline logout, and retry behavior are not yet equivalent to v1.

## 3. Feature Parity Audit

| Capability | v1.4 behavior | v2 status | Migration action |
| --- | --- | --- | --- |
| Login/session | Login, role check, restore, auth failure handling, logout cleanup | Basic login/restore/logout | Add temporary-failure retry, request cancellation, offline logout, and complete cleanup |
| Today | Current/next task, metrics, reviews, next exam, motivation, timeline | Basic dashboard/task display | Add real metrics, reviews, task states, motivation, and offline/empty/error states |
| Schedule | Date navigation, Shamsi labels, daily motivation, timeline | Date loading foundation | Add Shamsi utilities, labels, cache, and full task presentation |
| Task details | Modal, comments, status, partial completion, issue reporting | Detail UI and backend detail/comments/issues endpoints implemented; partial/skipped persistence still incomplete | Add status persistence and connect comments/issues UI |
| Study/focus | Start, active restore, heartbeat, pause/resume, full-screen focus, finish | Backend lifecycle and target UI implemented; heartbeat/full-screen focus still incomplete | Add heartbeat scheduling, full-screen focus presentation, offline reconciliation, and richer session completion |
| Exams | Catalog filters/search/paging, availability, progress, retry, syllabus | List/detail/progress/attempt persistence and local draft implemented | Add retry/syllabus and server-backed draft autosave UI |
| Chat | Conversations, pagination, read state, reactions, replies, Markdown, SSE/polling | Student conversation discovery, server read state, send, polling/SSE refresh | Add pagination, reactions/replies/Markdown, offline send, and event reducer |
| Notifications/push | Local store, sync, read/read-all, Web Push settings | API-backed list/read/read-all; push settings missing | Add realtime updates and web-only push adapter |
| Progress/learning | Weekly progress, subjects, mistakes, learning items and reviews | Progress/reviews route and mistake/progress backend projections implemented | Add persisted learning items, spaced repetition, subjects, and mistake editing UI |
| Reports/recovery | Slider report and recovery request, offline queue | Student report/recovery entities, endpoints, forms, and draft fallback implemented | Add admin review/status workflows, activity records, and full offline reconciliation |
| Security/settings | Password change, session management, theme | Session listing/revocation and backend password endpoint; password form/theme missing | Add password form, persisted theme, and secure lifecycle handling |
| Offline/update | Write queue, offline bar, PWA update modal/version checks | Queue worker, web/Tauri queue providers, reconnect flush, and sync upload implemented | Add cache hydration, server conflict reconciliation, and web update adapter |

## 4. Verified Target Backend Reality

The following student-facing v2 operations are present in current controllers or documented implementation:

- `POST /api/v2/auth/login`
- `GET /api/v2/auth/me`
- `POST /api/v2/auth/logout`
- `GET /api/v2/students/me`
- `GET /api/v2/student/dashboard`
- `GET /api/v2/student/today`
- `GET /api/v2/student/plans?date=YYYY-MM-DD`
- `POST /api/v2/student/tasks/:id/complete`
- `GET /api/v2/student/progress`
- `GET /api/v2/student/reviews`
- `GET /api/v2/student/exams`
- `POST /api/v2/student/exams/:id/start`
- `POST /api/v2/student/exams/:id/submit`
- `GET/POST /api/v2/chat/conversations/:id/messages`
- `GET /api/v2/events`
- `GET/POST /api/v2/sync` and `/api/v2/sync/upload`

Important contract risks:

1. `backend-v2/src/modules/sync/sync.controller.ts` returns empty arrays and accepts changes without applying them. It is scaffolding, not an offline sync implementation.
2. The v2 exam controller supports start and submit, but does not expose the legacy progress, retry-request, syllabus-progress, history, or resume contract.
3. The v2 chat controller supports messages for a supplied conversation id, but the target UI hardcodes `advisor`; conversation discovery and read state are absent.
4. The v2 student task completion handler is present, but study sessions, comments, issues, reports, recovery, and presence/activity contracts remain UNKNOWN in the target backend.
5. `student-app-v2/src/features/more/MorePage.tsx` uses hardcoded notification records. It is not connected to `backend-v2` notifications.

## 5. Migration Method

### Phase 0: Baseline and safety

1. Keep v1 production traffic and database unchanged.
2. Export a read-only snapshot of the v1 SQLite database.
3. Record a parity fixture for one student containing plans, task progress, exams, attempts, chat, notifications, reports, and learning items.
4. Define the v2 API envelope, date/time format, IDs, role names, ownership rules, and error codes before client work.
5. Add a feature flag or deployment switch so users can return to v1 without data rollback.

### Phase 1: Auth and read-only parity

1. Validate v2 login, restore, role rejection, logout, cookie expiry, CSRF, and app restart on web, Linux, and Android.
2. Implement dashboard, today, plans, reviews, and exams against real v2 responses.
3. Add loading, empty, error, retry, offline, RTL, and small-screen states.
4. Cache successful reads in SQLite/Tauri and `localStorage` for the web fallback.

### Phase 2: Task and study lifecycle

1. Add v2 task detail/comments/issues and student ownership enforcement.
2. Add start/active/pause/resume/heartbeat/finish study-session endpoints.
3. Persist active sessions and restore them after restart/resume.
4. Rebuild focus mode and task completion with optimistic UI plus durable queued mutations.

### Phase 3: Exam parity

1. Add progress/detail, availability reasons, attempts/history, retry requests, and syllabus progress.
2. Implement quiz start/resume, answer drafts, timer expiry, confirmation, submit, and review.
3. Define conflict behavior for answers. Never silently overwrite a newer server attempt.

### Phase 4: Communication and support

1. Add conversation discovery, message pagination, read state, unread counts, and send failure recovery.
2. Implement the SSE event reducer and polling fallback for chat, plan, exam, review, and notifications.
3. Add notifications, read/read-all, push preferences, night reports, recovery requests, and activity/presence.

### Phase 5: Offline and native hardening

1. Connect feature mutations to `SQLiteSyncProvider`; implement upload, pull, retry/backoff, deduplication, and conflict handling.
2. Define which data is cacheable and how stale data is labeled.
3. Validate cold launch, background/resume, process recreation, network loss/recovery, logout, and account switching.
4. Add web PWA update behavior separately from Tauri desktop/Android updates.

## 6. Data Migration Rules

The database migration is separate from the client rewrite. Use read-only export from the v1 database and import into a fresh v2 database, as described in `docs/migration-v1-to-v2.md`.

Required transformations:

- Map v1 user roles to v2 enum values (`student` versus `STUDENT`) explicitly.
- Preserve stable IDs where v2 entity constraints allow it; otherwise maintain an old-to-new ID map.
- Convert plan/task times and dates without timezone assumptions. Persian display dates must remain presentation data, not database keys.
- Preserve quiz attempts, selected answers, correctness, explanations, mistakes, learning-item links, and review history.
- Preserve notification ownership and chat conversation membership; do not import records without a student/user ownership mapping.
- Validate every imported relation and reject orphaned task, exam, answer, message, or notification rows.
- Never import legacy session cookies or plaintext credentials.

Unknown until verified with a migration script: exact v2 schema coverage for daily reports, recovery requests, learning review history, push subscriptions, conversation membership, and password/session history.

## 7. Release Gates

Do not cut over until all gates pass:

- Auth: login, restart restore, expiry, wrong-role rejection, logout, and secure cleanup.
- Planning: today, another date, task details, completion, partial/issue flows, and active study session.
- Exams: list, unavailable state, start/resume, timer expiry, draft restore, submit, result, and retry/syllabus flows.
- Chat: history, send, read state, unread badge, realtime event, polling fallback, and failed send recovery.
- Offline: cached read, queued write, reconnect flush, duplicate prevention, and conflict reporting.
- Native: Android SDK 24+, safe areas, back navigation, keyboard, background/resume, and packaged build.
- Migration: fixture counts and sampled records match v1; tenant/student ownership checks pass; rollback switch is tested.
- Observability: API errors, sync failures, client version, and migration mismatches are diagnosable without exposing secrets.

## 8. Rollback

Keep v1 serving `/api/v1` and keep its database untouched during staged rollout. If a v2 gate fails, switch the client flag back to v1, stop v2 writes if necessary, retain v2 logs/database for diagnosis, and reconcile only through an explicit migration/replay procedure. Do not attempt a blind reverse migration from v2 into v1.

## Recommendations

1. Treat `docs/student-app-v2-gap-analysis.md` and `docs/student-app-v2-implementation-plan.md` as supporting plans; this document is the current migration decision record.
2. Finish backend contracts before adding more UI polish. The largest risk is a visually complete client backed by incomplete sync and mutation semantics.
3. Move API DTOs and normalized student models into `student-core` or a shared contract package so web, Tauri, and Android cannot drift.
4. Replace hardcoded/demo state in `MorePage` and direct feature-level HTTP calls with store/provider-backed flows before parity testing.
5. Add automated contract and parity tests around the fixture before any production cutover.