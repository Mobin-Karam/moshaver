# Admin App v1.6.0 Update Report

## Product goal

Make the advisor workflow faster without adding a heavy frontend framework. The admin remains a static RTL vanilla-JavaScript PWA.

## Student management workspace

The Students section is now a management workspace instead of a single profile form:

- searchable student directory;
- active/inactive account status;
- quick account creation with a generated initial password and a one-time copyable credential handoff panel;
- profile and username editing;
- password reset;
- safe deactivate/reactivate actions;
- direct jump to student chat;
- learning-system summary and CRUD;
- exam/practice attempt history and detailed answer review.

Student deactivation is intentionally soft. History is not erased.

## Realtime operations console

The Live screen now combines all students in one bounded snapshot:

- online/offline presence;
- active study session;
- current scheduled task;
- most recently opened major student-app screen;
- today's plan completion percentage;
- today's finished study minutes/sessions;
- due/pending learning items and mastery;
- latest exam/practice score;
- recent activity feed and open issues.

It includes normalized state/freshness filters, per-student cockpit and message actions, and a cross-student event timeline. It uses the existing SSE + presence/activity architecture with periodic reconciliation.

## Archive recovery and system safety

- Archived students are explicitly filterable and restorable with their educational history.
- System health reports SQLite integrity, size, service version/uptime, sessions, connections, and last backup time without leaking paths.
- Backup download uses SQLite `VACUUM INTO`, validates the resulting snapshot, applies admin/CSRF/rate-limit controls, audits outcomes, and removes temporary files.
- Admin CSS is generated from ordered `css/src/` sources into the production-loaded `css/app.css`, with dark and responsive layers.

## Exam/practice management

Question authoring now supports:

- book;
- chapter;
- lesson;
- topic;
- full answer explanation;
- future-review hint.

Questions can now be edited as well as created and deleted for both exam-linked and standalone practice quizzes.

## Learning loop

From the student workspace, the advisor can create/edit/delete relearning items tied to a student's subject/book/chapter/lesson. Attempt detail also lets the advisor open the exact wrong answer and add or edit its learning item.

Advisor-created items notify the student and update the student PWA through SSE.

## UI/UX direction

The release adds focused styling for:

- student directory and workspace;
- compact account actions;
- KPI summaries;
- live-context cards;
- learning rows;
- attempt history and answer detail;
- responsive layouts and touch targets.

The previous modular core/components/views architecture is preserved.

## Validation

Run:

```bash
./check-admin.sh
```

For backend operational coverage also run `npm run test:admin-ops` from `backend/`. It checks authorization, snapshot integrity, repeated backup/cleanup/audit, the all-student realtime shape, archive listing, and restore.
