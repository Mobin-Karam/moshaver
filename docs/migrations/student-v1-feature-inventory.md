# Student App v1 Backup Analysis

Date: 2026-08-20
Checkpoint target: `student-app-v1-stable`
Source app: `student-app/`
Backup copy: `backup/student-app-v1/`

## Scope

This document records the current Moshaver Student App before migration work. The application code was not modified. The backup copy was created from `student-app/` and verified with `diff -qr student-app backup/student-app-v1`.

## Framework

- Static HTML/CSS/JavaScript application.
- No package manager or build step inside `student-app/`.
- Runtime entrypoint is `index.html`.
- JavaScript is loaded as browser globals:
  - `config.js` defines `window.APP_CONFIG`.
  - `js/api.js` defines `window.API`.
  - `js/app.js` owns application state, rendering, navigation, and business flows.
  - `js/update.js` owns service worker registration and update prompting.
- PWA files:
  - `manifest.webmanifest`
  - `sw.js`
  - `sw.template.js`
  - `version.json`

## Dependencies Inventory

Runtime dependencies are browser platform APIs, not npm packages:

- DOM APIs: `document`, event handlers, class toggling, generated HTML strings.
- Network APIs: `XMLHttpRequest`, `EventSource`.
- Storage APIs: `localStorage`, `sessionStorage`, Cache Storage through service worker.
- PWA APIs: `navigator.serviceWorker`, service worker lifecycle, app manifest.
- Connectivity APIs: `navigator.onLine`, `online` and `offline` window events.
- Browser dialogs: `confirm`.
- Timers: `setInterval`, `setTimeout`.

Deployment/runtime files:

- `Dockerfile`
- `nginx.conf`
- `nginx.conf.template`
- `docker-entrypoint.sh`
- `local-server.js`
- `run-local-student.sh`

## Routes And Pages

The app is a single-page application implemented with section switching. There is no router library.

- Login screen: `#loginScreen`
- Main app shell: `#appScreen`
- Bottom navigation views:
  - `today`: today dashboard, current task, metrics, reviews, next exam, timeline
  - `schedule`: daily plan calendar
  - `exams`: exams list and exam launch flow
  - `chat`: student-advisor chat
  - `progress`: subjects and mistake notebook
  - `more`: reports, recovery requests, notifications, account security, theme, logout

Navigation is controlled by `switchView(name)` and buttons with `data-view`.

## Components

Components are DOM sections and modal fragments built directly in `index.html` and `app.js`.

- Top bar, sync state, notification badge
- Bottom navigation
- Today cards: current task, next task, metrics, reviews, exam focus, timeline
- Schedule timeline and date controls
- Exam cards, exam modal, quiz modal
- Chat shell, message list, quick replies, composer
- Progress subject list and mistake list
- More menu
- Modals:
  - task details
  - issue report
  - night report
  - recovery request
  - password change
  - notifications
  - exam details
  - quiz runner
  - update prompt
- Focus mode overlay for active study sessions
- Toast stack and offline bar

## Services

- `js/api.js`
  - Base URL from `APP_CONFIG.API_BASE_URL`, default `/api/v1`.
  - Cookie-based authenticated requests with `withCredentials=true`.
  - CSRF token storage and retry on CSRF failure.
  - Auth failure callback on 401.
  - Request abort tracking.
  - SSE connection for realtime events.
- `js/update.js`
  - Registers `sw.js`.
  - Polls `version.json`.
  - Shows update modal.
  - Defers update while runtime is busy.
- `sw.js`
  - Caches app shell.
  - Network-first navigation with cached `index.html` fallback.
  - Cache-first static assets.
  - Excludes API, cross-origin, `config.js`, `version.json`, and `sw.js`.

## API Dependency Map

Authentication and account:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/change-password`

Dashboard, plan, and schedule:

- `GET /dashboard?date=YYYY-MM-DD`
- `GET /plans?date=YYYY-MM-DD`
- `PUT /tasks/:id/completion`
- `GET /tasks/:id/comments`
- `POST /task-issues`
- `POST /recovery-requests`
- `POST /reports`

Study sessions and activity:

- `POST /study-sessions/start`
- `GET /study-sessions/active`
- `POST /study-sessions/:id/heartbeat`
- `POST /study-sessions/:id/finish`
- `POST /presence`
- `POST /activity`

Reviews, progress, and mistakes:

- `GET /reviews`
- `PATCH /reviews/:id`
- `GET /subjects`
- `GET /mistakes?limit=80`
- `PATCH /mistakes/:id`
- `PUT /syllabus/:id/progress`

Exams and quizzes:

- `GET /exams`
- `GET /exams/:id/progress`
- `POST /exams/:id/start`
- `POST /exams/:id/retry-request`
- `POST /quizzes/:id/start`
- `POST /quizzes/:id/attempts`

Chat and realtime:

- `GET /chat/conversation`
- `GET /chat/conversations/:id/messages?limit=80`
- `POST /chat/conversations/:id/messages`
- `POST /chat/conversations/:id/read`
- `GET /events` through `EventSource`

Notifications:

- `GET /notifications`
- `PUT /notifications/:id/read`
- `PUT /notifications/read-all`

## Storage Usage

`sessionStorage`:

- `moshaver_student_csrf`: CSRF token.
- `moshaver_logout_pending`: local flag for logout that must be flushed to server.

`localStorage`:

- `moshaver_queue:<studentId|anonymous>`: offline mutation queue.
- `moshaver_student_auth_signal`: cross-tab login/logout broadcast.
- `moshaver_quiz_draft:<runId>`: in-progress quiz answers and question index.
- `kp_theme`: light/dark theme preference.
- `moshaver_student_installed_version`: installed app version for update prompts.

Cache Storage:

- Cache names follow `moshaver-student-<APP_VERSION>`.
- App shell includes `index.html`, CSS, JS, manifest, icons, and key SVG assets.

## Authentication Flow

1. On startup, `flushPendingLogout` attempts to finish any queued logout.
2. `restoreStudentAuth` calls `GET /auth/me`.
3. If authenticated, the user must have role `student`.
4. Login posts username/password to `POST /auth/login`.
5. CSRF token returned by login or `/auth/me` is stored in `sessionStorage`.
6. Mutating requests include `X-CSRF-Token`.
7. A 403 CSRF error triggers one `/auth/me` refresh and request retry.
8. A 401 outside suppressed auth flows triggers local logout/reset.
9. Logout aborts active requests, stops timers/SSE, sets `moshaver_logout_pending`, and calls `POST /auth/logout`.
10. Login/logout are broadcast across tabs with `localStorage`.

## PWA And Offline Features

- Manifest supports standalone install in Persian RTL.
- Service worker app-shell cache allows static UI loading offline.
- Navigation requests use network-first with cached `index.html` fallback.
- Static assets use cache-first.
- `update.js` polls `version.json` every 90 seconds and prompts for updates.
- Offline mutations are queued only for flows that use `queued()`:
  - task completion
  - task issue reports
  - night reports
  - recovery requests
- Offline queue flushes on boot and on `online` event.
- There is no full offline read cache for dashboard/plan/API payloads beyond already-rendered state and service worker shell caching.

## Notifications

- In-app notifications are loaded from `GET /notifications`.
- Individual notifications can be marked read with `PUT /notifications/:id/read`.
- All notifications can be marked read with `PUT /notifications/read-all`.
- Realtime `notification.created` increments the visible badge and shows a toast.
- No browser push notification API is currently used.

## Chat Implementation

- Conversation metadata loads from `GET /chat/conversation`.
- Messages load with `GET /chat/conversations/:id/messages?limit=80`.
- Sending posts to `POST /chat/conversations/:id/messages`.
- Read state posts to `POST /chat/conversations/:id/read`.
- Realtime uses SSE event types:
  - `chat.message.created`
  - `chat.messages.read`
- If `EventSource` is unavailable, active chat polling runs every 20 seconds.
- UI is rendered from `state.chatConversation`, `state.chatMessages`, and `state.chatUnread`.

## Exam Flow

- Exams list is loaded with `GET /exams`.
- Each card enriches itself with `GET /exams/:id/progress`.
- Opening an exam shows readiness, window, attempt limits, syllabus progress, retry state, and start/retry actions.
- If an exam is not open yet, a timer can refresh at the open time.
- Start posts to `POST /exams/:id/start`.
- Exam execution reuses quiz runner state and UI.
- Remaining time is the minimum of quiz duration and exam close time.
- Closing an exam run saves a local quiz draft but does not submit.
- Final submission posts answers to `POST /quizzes/:id/attempts`.
- Retry requests post to `POST /exams/:id/retry-request`.

## Planner Logic

- `loadDashboard` fetches day dashboard and sets `state.plan`, `state.subjects`, metrics, notifications, reviews, and active session.
- Current/next task is calculated client-side from task start/end times, completion state, and active session.
- Task statuses:
  - done
  - partial
  - skipped
  - current
  - overdue
  - next
- Planned minutes are calculated from task start/end times.
- Study start/finish is session-based and server-backed.
- Active study sessions show focus mode and a local timer.
- Completion can be done directly or from an active session.
- Schedule view fetches arbitrary date plans with `GET /plans?date=...`.

## Migration Risks

- Business logic is tightly coupled to DOM rendering and browser globals in `app.js`.
- API, state transitions, Persian date formatting, planner calculations, timers, and UI updates are mixed in single functions.
- Auth depends on browser cookies, `withCredentials`, CSRF header behavior, and `sessionStorage`.
- Realtime depends on browser `EventSource`; Tauri/native targets may need a replacement or polyfill.
- Offline queue is localStorage-based and only covers selected mutation flows.
- Service worker and Cache Storage do not map directly to native desktop/mobile storage.
- Quiz and exam timers are client-side and must be preserved exactly to avoid attempt-window bugs.
- App update behavior is PWA-specific and should not be carried directly into Tauri.
- Cross-tab auth broadcast through localStorage may need a native equivalent or may be unnecessary in Tauri.
- There are no automated student-app tests in this static app, so migration requires characterization tests before extraction.

## Migration Plan

1. Keep `student-app/` frozen as v1 reference.
2. Use `backup/student-app-v1/` for source comparison and recovery.
3. Add characterization tests around pure calculations before extracting logic:
   - Persian date conversion
   - task status and current/next task selection
   - planned minute calculation
   - quiz remaining-time calculation
   - offline queue behavior
4. Extract business logic into `student-core/` without React, DOM, PWA, or Tauri dependencies.
5. Define provider interfaces for auth, storage, notifications, sync, network, realtime, and clock/timers.
6. Move API route construction and response normalization behind network services.
7. Implement browser adapters that preserve the current static app behavior.
8. Only after parity is proven, build the Tauri v2 student shell using the same core layer.
9. Keep PWA-specific update/offline shell logic in browser adapters; implement native equivalents separately.
10. Validate each migrated flow against the frozen v1 app before removing or replacing browser-specific code.

## Backup Contents

The backup includes the full `student-app/` tree:

- source: `index.html`, `js/`, `css/`
- assets: `icons/`
- PWA configuration: `manifest.webmanifest`, `sw.js`, `sw.template.js`, `version.json`
- runtime configuration: `config.js`
- deployment configuration: `Dockerfile`, nginx templates, Docker entrypoint
- local run helper: `local-server.js`, `run-local-student.sh`

