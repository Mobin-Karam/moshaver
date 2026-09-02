# Backend v2 Discovery

## Current API Map

The current backend is a dependency-light Node.js service in `backend/src/server.js`.

- Public: `/`, `/health`, `/ready`, `/api/v1/health`, `/api/v1/ready`, `/api/v1/public/app-version/:app`
- Auth: `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/change-password`, `/api/v1/auth/sessions`
- Realtime: `/api/v1/events`
- Student: dashboard, plans, task completion, presence, activity, study sessions, task issues, reviews, subjects, exams, quizzes, reports, chat, notifications, mistakes, recovery requests
- Admin: dashboard, students, plans, tasks, subjects, exams, questions, retry requests, reports, quizzes, live/activity, advisor inbox, comments, reviews, import template/preview/commit/history, app versions/releases, audit

## Current Database Schema Map

The v1 SQLite schema is created in `backend/src/db.js` and includes:

- Identity/security: `users`, `sessions`, `auth_rate_limits`, `audit_logs`
- Student domain: `students`, `subjects`, `student_subjects`, `plans`, `tasks`, `task_completions`, `daily_reports`
- Exams/quizzes: `exams`, `exam_syllabus`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`, `quiz_runs`, `exam_attempt_requests`
- Learning support: `syllabus_progress`, `review_items`, `recovery_requests`, `task_issues`, `advisor_comments`
- Comms/realtime: `notifications`, `chat_conversations`, `chat_messages`, `chat_reads`, `realtime_events`, `student_presence`, `activity_events`
- App ops: `schema_migrations`, `app_versions`, `app_releases`, `data_imports`

## Current Frontend Dependencies

- `admin-v2` is Vite + React + TypeScript.
- Its API client defaults to `/api/v1`, with `VITE_API_URL` override support.
- It expects cookie auth, CSRF refresh via `/auth/me`, and SSE through `/events`.
- Existing student and admin v1 static apps still consume `/api/v1`.

## Migration Risks

- v1 has active production behavior tied to direct SQLite statements and Persian response copy.
- Session and CSRF semantics must remain compatible for current apps until cutover.
- Exam attempt limits, retry windows, import behavior, and realtime event names encode business rules in `server.js`.
- SQLite `node:sqlite` and new TypeORM drivers must not open the same production database in incompatible modes.
- Admin v2 can point to `/api/v2`, but v1 apps must remain on `/api/v1`.

## Breaking Change Report

- Do not route `/api/v1` to backend v2 until feature parity is validated.
- Backend v2 uses its own tables and migrations first; data migration is a separate controlled step.
- Admin v2 should switch via `VITE_API_URL=/api/v2` only after its expected DTOs are implemented.
- Docker/run scripts should keep v1 and v2 runnable independently during migration.
