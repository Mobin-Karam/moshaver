# Moshaver v2 initial analysis

Historical planning snapshot. For the current repository shape, start with the [system map](../../architecture/system-map.md).

## Current Features

- Student authentication through backend-v2 session cookies and CSRF tokens.
- Daily plan loading from `/student/dashboard` and `/student/plans`.
- Student home screen with current task, progress metrics, and task list.
- Student plan screen with date navigation and daily task cards.
- Student exam list plus in-app exam start, timer, answers, submit, and result review.
- Advisor chat backed by backend chat messages, SSE refresh, polling fallback, and Telegram-style bubbles.
- Admin dashboard shell with student selection, planner, exams, question bank, chat, reports, notifications, and settings.
- Admin student management supports create, edit, password reset, delete, and navigation to all management sections.
- Admin planner supports manual day planning, JSON import/preview, and publish range.
- Docker Compose v2 stack runs backend, student app, and admin app.

## Current Problems

- Student task completion is still binary at API level; focus-mode feedback is captured locally first, but the backend endpoint currently stores only `completedAt`.
- Task runtime states are inferred on the client from start/end time; there is no backend `TaskProgress` entity yet.
- Exam attempts store score and finish time, but not persisted per-question answers or weak-topic analytics.
- Chat supports text messages, but typed indicators, unread persistence, read receipts, attachments, and rich message types are not fully persisted.
- Notifications exist as backend entities/services but the student notification center and admin audible/native notification workflows still need product integration.
- Motivation text can be displayed from plan/dashboard data, but there is no dedicated `Motivation` entity or admin override flow yet.
- Offline sync endpoints exist as a foundation, but task/exam/chat offline conflict handling is not complete.

## Broken Or Weak Flows

- Student can finish a task, but cannot yet send actual tests, difficulty, and note to backend.
- Student can take an exam, but retry request and advisor approval are not implemented.
- Admin can create exams and questions, but assigning exams to specific plan tasks is only partially represented through task `examId`.
- Reports and advisor inbox currently return placeholder data where v1.4.2 had richer workflows.
- The student More section still needs a v1.4.2 parity pass.

## Missing Features

- Backend entities: `TaskProgress`, `ExamRetryRequest`, `Motivation`, `StudentAnalytics`.
- Exam APIs: answer autosave, retry request, retry review, weak-topic result breakdown.
- Chat APIs: read receipts, typing state, unread counters, message type rendering for `PLAN`, `EXAM`, `TASK`, `MOTIVATION`, `WARNING`.
- Notification center with read/unread state, action buttons, reminders, sound, and native browser notifications.
- Admin JSON import for exams/questions/motivation with validation previews.
- Analytics dashboards for study consistency, completion rate, exam scores, weak topics, and mistakes.
- Dedicated `docker-compose.dev.yml` and `start-dev.sh`.
- Test report covering login, session restore, plan loading, task completion, exam attempt, chat, notifications, and retry requests.

## Migration Risks

- v1.4.2 feature names and workflows do not map 1:1 to current v2 entities; adding parity without a migration map can create duplicate concepts.
- Persisting per-question answers and task progress requires migrations and careful compatibility with existing SQLite data.
- Offline support can corrupt task/exam state if client-generated updates are not idempotent.
- Native/browser notifications require user permission and browser-specific behavior, especially Firefox.
- Low-end Android performance can degrade if long task/chat lists are not bounded or virtualized.

## Priority Plan

1. Stabilize student daily UX: dashboard, task states, timeline, focus mode, completion feedback.
2. Persist task progress with actual minutes, tests, difficulty, and note.
3. Connect exams to plan tasks and add answer autosave plus retry request.
4. Complete text chat features: unread counts, typing indicator, read receipts, rich message type rendering.
5. Add notification center and admin audible/native notifications.
6. Add analytics and reports from real task/exam/chat data.
