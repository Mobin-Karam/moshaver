# Backend changelog

## 1.4.1

- Added nullable `tasks.exam_id` migration.
- Plan mapping now exposes `examId`.
- Admin plan task create/update/duplicate preserves linked exams.
- JSON import supports `exams[].ref` + `plans[].tasks[].examRef`.
- Exam submissions automatically complete linked plan exam tasks.


## 1.4.0
- Student-targeted timed exam delivery with publish/open/close/duration and fixed one base attempt.
- Active exam run resume plus Student retry-request and Advisor approve/reject workflow.
- Additive `exam_attempt_requests` table and exam delivery columns.
- Exam question CRUD and linked main quiz.
- JSON import schema v2 for plans, exams, syllabus and questions; Admin-selected student is authoritative.
- Notification read-all endpoint and exam retry notifications/SSE events.
- Hardened exam PATCH validation and fixed one-attempt semantics for newly managed/imported exams.
- CORS compatibility includes `Cache-Control` and `Pragma`.
- Regression tests cover time gating, one-attempt/resume/retry approval and JSON target enforcement.

## 1.3.3
- Stable per-session CSRF token; repeated/concurrent `/auth/me` calls no longer invalidate Student/Admin mutations.
- Idempotent logout that always clears the session cookie, including expired/revoked sessions.
- Successful login replaces an existing browser session cookie and revokes the replaced server session.
- Lazy SQLite migration adds `sessions.csrf_token` without deleting existing data.
- Different-task study-session conflicts return `409 ACTIVE_STUDY_SESSION` instead of silently binding the UI to the wrong task.
- Regression coverage for stable CSRF, old-token mutation validity, invalid CSRF rejection, idempotent logout, session replacement, chat/SSE, JSON import and report integrity.

## 1.3.1
- Compatibility release for the frontend startup-auth race fix.

## 1.3.0
- Secure cookie + CSRF session architecture.
- Login throttling and stronger versioned scrypt hashes.
- Password/session management endpoints.
- Shared SSE event stream and persisted event replay.
- Advisor/student chat, read receipts and unread counts.
- Objective report metrics and server-timed quiz runs.
- Activity whitelisting/rate limits and production fail-closed configuration.
- Compatible startup migration for v1.2 SQLite sessions/database.
