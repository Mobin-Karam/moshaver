# Admin v1.6 to v2 migration audit

This document is the parity contract for retiring `v1.4/admin-app`. A row is complete only when the React screen exposes the same user outcome and calls the same protected backend operation; visual similarity alone is not parity.

| v1.6 area | Required capability | v2 destination | Status |
| --- | --- | --- | --- |
| Authentication | cookie session, CSRF recovery, admin-role rejection, logout | auth provider/login/layout | Complete |
| Dashboard | global counts, selected-student overview, attention inbox, unread chat | dashboard | Complete |
| Live operations | presence, current task/session, plan progress, study totals, attempt, issues, reviews, event timeline, SSE refresh | live | Complete |
| Chat | conversation search, thread, send, Enter/Shift+Enter, unread/read state, realtime refresh | chat | Complete |
| Planner | day/week range, task creation, drafts, publication, JSON preview/commit | planner | Complete |
| Import/export | safe preview, replacement switches, draft/publish commit, template and range export | planner | Complete |
| Exams | create/edit/delete, search/filter, publish/status, retry review, syllabus, question management, JSON import/export | exams/questions | Complete |
| Quiz bank | quiz CRUD and question CRUD | questions | Complete |
| Reports | date/search/sort, study/test/focus/fatigue/motivation/problem presentation | reports | Complete |
| Students | search/filter, create/edit, activate/deactivate/archive/restore, reset password, force logout, overview, learning, attempts, weekly/topics | students | Complete |
| Subjects | global subject creation/order and per-student status/progress/mastery/note | subjects | Complete |
| Notifications | durable inbox, unread filter, single/read-all, advisor inbox, SSE refresh | notifications | Complete |
| System | health/database metadata, SQLite backup/restore, sessions, password, app releases, import history, audit history | system | Complete |
| Deployment | same-origin `/api/v1`, development backend switch, production nginx fallback | shared API/Docker/nginx | Complete |

## Retirement gate

Do not remove or redirect the v1.6 admin deployment until all of these pass on the target environment:

1. `npm test` and `npm run build` in `admin-v2`.
2. The backend admin smoke test against a disposable database.
3. Browser smoke: login, select student, create/edit/archive/restore student, save/publish a plan, import JSON, create/edit/delete an exam and question, send/read chat, edit subject progress, download a backup.
4. Restore must be tested only against a disposable deployment because it intentionally replaces the SQLite database and restarts the backend.
5. Compare the route inventory using `npm run audit:parity`; any v1-only protected endpoint must be explicitly explained here before retirement.

The v1.6 directory remains a frozen rollback reference during rollout. The production switch should point the admin domain to `admin-v2`; deletion can happen in a later release after monitored acceptance.
