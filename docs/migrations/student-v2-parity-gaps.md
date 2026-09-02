# Student App v2 Gap Analysis Against Legacy

Date: 2026-08-20

## Summary

`student-app-v2/` is currently a working multi-platform scaffold, not a feature-complete migration of the legacy `student-app/`.

What v2 has:

- React/Vite/Tauri shell.
- Bottom navigation for Home, Plan, Exam, Chat, More.
- Login/session restore/logout against backend-v2.
- Backend-v2 dashboard and exams list loading with empty/error states.
- Backend-v2 planning foundation: admin can create/publish day plans with task timing/subject/test metadata, and student can browse published day plans.
- Shared `student-core` logic for selected planner, task, exam, chat, notification, storage, and sync helpers.
- SQLite schema/provider groundwork for native storage.
- Verified web, Linux, Android, and Docker-stack builds during migration work.

What v2 does not yet have:

- Most legacy screens, modals, actions, and realtime/offline behavior.
- Feature parity with planner, exams, chat, notifications, progress, reports, recovery, security, PWA/update behavior, and active study mode.

## v1.4.2 Screencast Evidence

Reference: `/home/anonymous/Videos/Screencasts/Screencast From 2026-08-20 18-15-11.webm`, captured 2026-08-20, duration about 60 seconds.

The screencast confirms that legacy v1.4.2 is not just a simple dashboard. It shows a dense, action-oriented student app with these visible capabilities:

- Focus/study mode with a full-screen timer and finish action.
- Today dashboard with current/next task card, progress/metric tabs, and a detailed timeline.
- Task detail modal with task metadata, status/action buttons, and advisor/comment sections.
- Exam list with exam cards, attempts/time/question information, readiness/status rows, and a modal/detail workflow.
- Chat screen with conversation history, message bubbles, composer, and bottom navigation unread context.
- Active session card embedded back into the dashboard after returning from focus mode.
- Night report modal with multiple sliders and a submit action.
- Recovery request modal with reason/note fields and a submit action.
- More/status page with notification-like rows and colored status icons.
- Offline/update/dev indicators visible during reload/devtools inspection.

The current v2 stack only covers the initial shell plus auth/dashboard/exam-list foundation. The screencast therefore raises the replacement risk: v2 cannot be considered a v1.4.2 replacement until every visible workflow above has a real backend-v2 contract, UI, and smoke test.

## Highest-Risk Missing Flows

These are critical because students would lose day-to-day functionality if v2 replaced legacy now.

1. Authentication and secure session restore.
2. Today dashboard loaded from `/dashboard`.
3. Study session start, heartbeat, focus mode, and finish.
4. Task details, completion, partial completion, issue reporting, advisor comments.
5. Exam availability/progress, retry requests, timed quiz runner, answer draft restore, final submission.
6. Real chat conversation, send/read state, SSE realtime updates, fallback polling.
7. Notifications list/read-all/read-one and realtime notification handling.
8. Offline mutation queue flush for task completion, issue, report, recovery, messages, and exam answers.
9. Progress page with subject progress and mistake notebook.
10. Recovery and night report flows.

## Legacy Feature Inventory vs v2

| Area | Legacy behavior | v2 status | Gap |
| --- | --- | --- | --- |
| Login | Username/password login, role validation, CSRF setup, wrong-role logout | Basic backend-v2 login exists | Need legacy retry/error semantics and full visual parity |
| Session restore | `/auth/me`, retry on temporary network failure, pending logout flush | Basic restore exists | Need retry-on-temporary-failure and pending logout flush |
| Logout | Abort requests, stop timers/SSE, pending logout if offline, cross-tab signal | Basic logout exists | Need abort/timer/SSE cleanup and offline pending logout |
| Password change | Modal, min length, `/auth/change-password` | Missing | Need account security screen |
| Today dashboard | `/dashboard?date=...`, student subtitle, hello, metrics, next exam, reviews | Basic backend-v2 dashboard load | Need legacy dashboard richness, date query, reviews, next exam, and real metrics |
| Current task | Current/next from plan + active session, start/open controls | Partial core logic, minimal UI | Need legacy current-task actions and active session card |
| Timeline | Status chips, task type icons, exam CTA, details | Basic list only | Need full task cards and modal |
| Task modal | Details, comments, start/finish, done, partial, issue, quiz CTA | Missing | Need task details workflow |
| Task completion | `PUT /tasks/:id/completion`, offline queue | Demo state only | Need API + queue + refresh behavior |
| Study sessions | Start, active restore, heartbeat every 45s, finish, actual minutes | Missing | Need session provider, timers, cleanup |
| Focus mode | Full-screen focus overlay, timer, finish/back | Missing | Need native/web focus UI |
| Task issues | Issue type choices, note, offline queue | Missing | Need issue modal and API |
| Reviews | `/reviews`, review card, mark done | Missing UI | Need reviews module in Home |
| Schedule | Date picker, prev/next/today, Shamsi labels, day plan, motivation | Day navigation and published-plan loading exist | Need Shamsi labels, motivation, richer empty/offline states |
| Exams list | `/exams`, card per exam, attempts/time/question stats | Basic backend-v2 list | Need legacy card detail, attempts, readiness, status rows |
| Exam progress | `/exams/:id/progress`, readiness, delivery state, syllabus progress | Missing | Need progress detail model/UI |
| Exam start | Availability rules, start/resume, close-time refresh | Missing | Need start/resume flow |
| Retry requests | Retry status and `/exams/:id/retry-request` | Missing | Need retry request UI/API |
| Syllabus progress | `PUT /syllabus/:id/progress` from exam modal | Missing | Need syllabus section |
| Quiz runner | Timed questions, progress bar, prev/next, blank confirm, submit | Demo timer only | Need full quiz UI |
| Quiz drafts | Save/load/clear draft by run id | Core has answer helpers only | Need storage-backed draft |
| Quiz submit | `/quizzes/:id/attempts`, result summary, refresh dashboard/progress/exams | Missing | Need submission flow |
| Chat | Conversation load, messages, quick actions, composer, send | Static messages only | Need real conversation UI and backend-v2 message routes |
| Chat read state | Mark read, seen marks, unread badge | Static unread count only | Need API/read handling |
| Realtime | SSE `/events` for chat, plan, exam, notification, review | Missing | Need RealtimeProvider implementation |
| Poll fallback | Chat polling when EventSource absent | Missing | Need fallback strategy |
| Notifications | List modal, unread badge, read one, read all | Static card only | Need notification screen/modal |
| Progress | Subjects and mistake notebook | Missing | Need progress route and bottom-nav decision |
| Mistake reasons | Edit error reason via `/mistakes/:id` | Missing | Need mistake list/edit controls |
| Reports | Night report sliders and text fields, offline queue | Missing | Need report modal/screen |
| Recovery | Recovery reason/note, offline queue, activity record | Missing | Need recovery flow |
| Presence/activity | `/presence`, `/activity`, device labels | Missing | Need lifecycle integration |
| Offline bar | Online/offline UI and queued mutation status | Status pill only | Need queue-aware sync UI |
| Offline queue | localStorage queue in legacy; SQLite `sync_queue` now exists | Storage only | Need queue use in all mutation flows |
| PWA update | Service worker registration, version polling, busy-aware update modal | Missing for web | Need web-only update adapter if v2 web replaces PWA |
| Theme | Light/dark toggle with persisted setting | Missing | Need settings screen and theme store |
| Persian date | Shamsi conversion and labels | Missing in UI/core except not extracted | Need date utilities and tests |
| Toasts/errors | Success/error toasts across flows | Missing | Need app-level toast system |

## Screencast-Derived Parity Checklist

These items should be treated as acceptance criteria before replacing v1.4.2:

- Starting a study task opens focus mode and shows a continuously updating timer.
- Finishing focus mode returns to Today with an active/completed session reflected in the current task card.
- A task can be opened in a modal, inspected, completed, partially completed, reported as an issue, and reviewed with advisor comments.
- Today timeline renders all task states visible in v1.4.2: current, upcoming, completed, warning/issue, exam/review, and empty/offline states.
- Exam page renders real exam cards and opens detail/progress modal with availability, attempt counts, time limits, and question counts.
- Chat page loads real history, supports sending messages, preserves read/unread state, and receives realtime or polling updates.
- Report modal exposes the slider-based night report form and submits or queues it offline.
- Recovery modal exposes reason/note input and submits or queues it offline.
- More/status page lists notifications/activity/status rows with read/read-all behavior.
- Reload/update/offline indicators remain understandable during network changes and app updates.

## API Wiring Gap

Legacy uses these endpoint groups. v2 currently does not call them from UI:

- `/auth/login`
- `/auth/me`
- `/auth/logout`
- `/auth/change-password`
- `/dashboard`
- `/plans`
- `/tasks/:id/completion`
- `/tasks/:id/comments`
- `/task-issues`
- `/study-sessions/start`
- `/study-sessions/active`
- `/study-sessions/:id/heartbeat`
- `/study-sessions/:id/finish`
- `/presence`
- `/activity`
- `/reviews`
- `/subjects`
- `/mistakes`
- `/syllabus/:id/progress`
- `/exams`
- `/exams/:id/progress`
- `/exams/:id/start`
- `/exams/:id/retry-request`
- `/quizzes/:id/start`
- `/quizzes/:id/attempts`
- `/chat/conversation`
- `/chat/conversations/:id/messages`
- `/chat/conversations/:id/read`
- `/events`
- `/notifications`
- `/notifications/:id/read`
- `/notifications/read-all`
- `/reports`
- `/recovery-requests`

`student-app-v2/src/services/api-client.ts` is generic and not yet integrated into feature stores.

## Core Extraction Gap

`student-core` currently covers only part of the old logic:

Covered:

- planned minutes
- task status/current-next selection
- plan metrics
- task completion payload
- quiz remaining time
- quiz answer payload shape
- notification unread/read helper
- chat append/unread helper
- basic sync conflict policies
- storage/sync provider interfaces

Still missing from core:

- Shamsi date conversion and labels.
- Auth state machine, CSRF retry semantics, pending logout semantics.
- Dashboard normalization.
- Task comments and issue model.
- Study session lifecycle and heartbeat policy.
- Focus mode timer state.
- Exam delivery/action labels and reason text.
- Exam open/close refresh scheduling.
- Syllabus progress rules.
- Quiz draft persistence rules.
- Chat day separators/time formatting/read-state transitions.
- Realtime event reducer.
- Notification reducer.
- Offline queue flush/backoff/status behavior.
- Report and recovery payload builders.

## UI/UX Gap

The legacy app is modal-heavy and action-oriented. v2 is currently page-only and informational.

Missing UI primitives:

- Modal system.
- Toast system.
- Loading/error/empty states for all async flows.
- Confirm dialogs or native-safe confirmation layer.
- Form controls for reports/recovery/password/issue/retry.
- Timer/focus overlay.
- Readiness cards and delivery state cards.
- Badges for notification/chat unread counts.
- Date controls with Shamsi labels.
- Offline bar/sync detail state.

## Offline and Native Gap

SQLite tables exist, but they are not used by feature flows yet.

Required next work:

- Cache pulled plans, tasks, exams, questions, messages, and settings into SQLite.
- Queue mutations in `sync_queue` instead of direct-only calls.
- Implement `syncNow`, `pushChanges`, `pullUpdates`, and conflict handling in the app layer.
- Add manual conflict handling for exam answers.
- Add sync status UI states: Online, Offline, Syncing, Failed.
- Add network detection per platform.
- Add storage-backed quiz drafts and message queue.

## Recommended Implementation Order

1. Auth parity:
   - Login screen.
   - Restore session.
   - Logout.
   - CSRF/auth failure handling.
2. Real dashboard:
   - Load `/dashboard`.
   - Replace demo store.
   - Render Today with real plan/metrics/reviews/next exam.
3. Task and study flow:
   - Task modal.
   - Start/finish study session.
   - Heartbeat.
   - Focus mode.
   - Complete/partial/issue/comments.
4. Schedule parity:
   - Date controls.
   - `/plans?date=...`.
   - Motivation and timeline states.
5. Exams/quiz parity:
   - List/progress/modal.
   - Start/resume/retry/syllabus.
   - Full timed quiz runner and submission.
6. Chat/realtime:
   - Conversation/messages/send/read.
   - SSE reducer and polling fallback.
7. Notifications/progress/more:
   - Notifications list/read.
   - Subject progress.
   - Mistake notebook.
   - Reports/recovery/password/theme.
8. Offline-first:
   - SQLite caching.
   - Queue all supported mutations.
   - Pull refresh and conflict rules.
9. Web PWA adapter:
   - Service worker/update behavior if v2 web is intended to replace legacy PWA.
10. Full parity testing:
   - Characterization tests for every migrated legacy flow.
   - Browser smoke with mocked API states.
   - Linux Tauri build.
   - Android APK build and device/emulator run.

## Current Replacement Risk

Do not replace legacy `student-app/` with v2 yet.

v2 is buildable and has the right platform foundation, but it is missing most production student workflows. Replacing legacy now would remove active student capabilities around authentication, planning, study sessions, exams, chat, notifications, progress, offline behavior, and reports.
