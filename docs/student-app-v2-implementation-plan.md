<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Runbook](./REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student v2 Plan](./student-app-v2-implementation-plan.md) | [Student Core](./student-core-architecture.md) | [Tauri](./tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Student App v2 Implementation Plan

Date: 2026-08-20

This plan turns `student-app-v2-gap-analysis.md` into backend-v2 migration phases.

## Current Backend-v2 Reality

Available student-facing routes:

- `POST /api/v2/auth/login`
- `GET /api/v2/auth/me`
- `POST /api/v2/auth/logout`
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
- `GET /api/v2/sync`
- `POST /api/v2/sync/upload`
- `GET /api/v2/events`

Backend-v2 still lacks full legacy-compatible endpoints for chat messages, task comments/issues, study sessions, reports, recovery requests, mistake editing, retry requests, syllabus progress, and quiz answer submission with full answer payloads.

## v1.4.2 Screencast Baseline

Reference: `/home/anonymous/Videos/Screencasts/Screencast From 2026-08-20 18-15-11.webm`.

The screencast adds concrete parity targets beyond the first backend-v2 foundation:

- Focus/study timer must be a first-class workflow, not only a task completion button.
- Today must show active session, detailed task cards, tabs/metrics, and modal task actions.
- Exam must show card-level progress/status and detail modal before quiz runner work.
- Chat must be real and message-capable before v2 can replace v1.4.2.
- Night report and recovery request modals are visible legacy workflows and must be rebuilt.
- More/status/notifications must expose visible activity rows and read state.

## Phase 1: Backend-v2 Foundation

Status: in progress.

- Use `/api/v2` in `student-app-v2`.
- Restore session from `/auth/me`.
- Store and send backend-v2 CSRF token on mutations.
- Reject non-student accounts in the student app.
- Load `/student/dashboard` and `/student/exams`.
- Render empty/error states when backend-v2 has no student plan, tasks, or exams.
- Fix backend-v2 student lookup so student APIs resolve by authenticated user.

## Phase 2: Task and Schedule Parity

Status: in progress. First planning increment implemented: backend-v2 stores task timing/subject/test metadata, admin-v2 can create/publish day plans and inspect a week, and student-app-v2 can browse published day plans by date.

- Extend backend-v2 tasks with planned start/end, subject, test count, comments, partial completion, issue reporting, and ownership checks.
- Add task detail modal in `student-app-v2`.
- Add complete, partial, issue, comment, and refresh actions.
- Add day navigation and `/student/plans?date=YYYY-MM-DD`.
- Cache today plan and queued task mutations in SQLite.
- Match the v1.4.2 Today timeline states visible in the screencast: current, upcoming, completed, warning/issue, exam/review, and empty/offline.

## Phase 3: Study Session and Focus Mode

- Add backend-v2 study session routes: start, active, heartbeat, finish.
- Add focus overlay, elapsed timer, heartbeat cleanup, and finish workflow.
- Persist active session locally and restore it after app restart.
- Return from focus mode to Today with the active/completed session reflected in the current task card.

## Phase 4: Exams and Quiz

- Add exam progress, retry request, syllabus progress, quiz start/resume, question delivery, draft restore, and full answer submission.
- Replace the current exam list with exam detail and timed quiz runner.
- Persist quiz drafts in SQLite and queue safe answer updates offline.
- First match the v1.4.2 exam card/detail modal: availability/status row, attempt count, time limit, question count, and readiness messaging.

## Phase 5: Chat, Notifications, and Realtime

- Add backend-v2 conversation/message/read routes.
- Implement SSE reducer for messages, notifications, plan updates, exams, and reviews.
- Add polling fallback when SSE is unavailable.
- Replace static More-page notification count with backend notifications and read actions.
- Match the v1.4.2 chat screen with message history, bubbles, composer, send state, and unread/read handling.

## Phase 6: Reports, Recovery, Progress

- Add night report, recovery request, subject progress, mistake notebook, and mistake reason editing routes.
- Add Progress route or More-page section based on navigation density.
- Queue report/recovery/mistake mutations offline.
- Match the v1.4.2 slider-based night report modal and recovery reason/note modal.
- Match the v1.4.2 More/status list with colored rows and notification/activity read state.

## Phase 7: Release Parity

- Add web-only PWA update adapter if web v2 replaces the legacy PWA.
- Add persisted theme setting.
- Run parity smoke tests for web, Linux Tauri, and Android 7+ APK.
- Keep APK target under 20 MB unless feature scope requires a documented exception.
