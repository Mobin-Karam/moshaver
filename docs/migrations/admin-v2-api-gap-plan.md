# Admin v2 to API v2 gap plan

This is the implementation gate for connecting `admin-v2` to `/api/v2`. A UI route is not complete until its backend contract persists real data, enforces admin/student ownership, and has a disposable-database smoke test.

## Current gap matrix

| Priority | Area | Current API v2 state | Required work | Status |
| --- | --- | --- | --- | --- |
| P0 | Auth and students | Core CRUD exists; delete was destructive; lifecycle/detail routes missing | Archive/restore, activate/deactivate, reset password, revoke sessions, weekly/topic detail | Implemented; contract smoke pending |
| P0 | Learning | Only topic-mastery student summary existed | Durable learning items, status/mastery updates, review history, admin CRUD | Implemented; contract smoke pending |
| P0 | Dashboard/live | Overview is shallow; advisor inbox is empty; live route missing | Aggregate tasks, sessions, attempts, reports, issues, reviews and presence | Planned |
| P0 | Exams | Basic exam/question/attempt CRUD exists | Student scoping, persisted publish/status/note/instructions, syllabus, retry requests | Planned |
| P0 | Chat | Direct list/messages/read exists | Edit/delete/reactions plus group membership, roles, permissions, mute and leave | Planned |
| P1 | Subjects | No API v2 module | Subject catalog and per-student progress/mastery/note | Planned |
| P1 | Quizzes | No API v2 controller or persistence | Quiz CRUD and quiz-question CRUD | Planned |
| P1 | Notifications/push | Durable list/read exists | Pagination contract, advisor notification inbox, push config/subscriptions/preferences/test | Planned |
| P1 | System | Session/password routes exist | Database metadata/backup/guarded restore, releases, import history and audit history | Planned |
| P1 | Import/export | Preview/commit exists but combined payloads are incomplete | Transactional plan+exam import, validation, templates, JSON export and history | Planned |
| P2 | Reports | Placeholder summary only | Real date-range study/test/focus/fatigue/motivation/problem rows | Planned |
| P2 | Deployment | Dual API routing exists | Contract smoke, browser smoke, migration rehearsal, then switch Admin v2 default | Blocked by rows above |

## Build order

1. Finish student lifecycle and learning persistence, then exercise the Admin Students and Learning pages.
2. Complete exam persistence/scoping plus syllabus and retry workflows.
3. Complete direct/group chat and realtime monitor contracts.
4. Add subjects and quizzes, sharing question primitives without conflating exams and quizzes.
5. Add notification push/preferences and system operations with destructive restore isolated to disposable validation.
6. Replace dashboard/report placeholders with aggregate queries.
7. Run route-inventory, service tests, TypeScript builds, disposable SQLite migration/API smoke, and browser smoke before changing the production API default.

## Validation rules

- Run `npm run lint`, `npm test`, and `npm run build` in `backend-v2`.
- Run `npm test`, `npm run build`, and `npm run audit:parity` in `admin-v2`.
- Run all migrations against a temporary SQLite database, including an upgrade fixture with existing student rows.
- Do not validate database restore against the active or production database.
- Keep `/api/v1` available until every row above is implemented and the browser smoke passes.
