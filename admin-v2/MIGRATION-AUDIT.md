# Admin v1.6 to v2 migration audit

This document is the parity contract for retiring `v1.4/admin-app`. A row is complete only when the React screen exposes the same user outcome and calls the same protected backend operation; visual similarity alone is not parity.

| v1.6 area | Required capability | v2 destination | Status |
| --- | --- | --- | --- |
| Authentication | cookie session, CSRF recovery, admin-role rejection, queued offline logout, session expiry, cross-tab sync, visibility refresh, backend health, logout | auth provider/login/layout | Behavior migrated and unit-tested |
| Dashboard | global counts, selected-student overview, attention inbox, unread chat | dashboard | Re-audit required |
| Live operations | presence, current task/session, plan progress, study totals, attempt, issues, reviews, event timeline, SSE refresh | live | Re-audit required |
| Chat | conversation search, thread, send, Enter/Shift+Enter, unread/read state, realtime refresh | chat | Re-audit required |
| Planner | day/week/month, task CRUD, drafts, publication, JSON preview/commit | planner | Re-audit required |
| Import/export | safe preview, replacement switches, draft/publish commit, template and range export | planner | Re-audit required |
| Exams | create/edit/delete, search/filter, bulk actions, publish/status, retry review, syllabus, question management, JSON import/export | exams/questions | Re-audit required |
| Quiz bank | quiz CRUD and question CRUD | questions | Re-audit required |
| Reports | date/search/sort, study/test/focus/fatigue/motivation/problem presentation | reports | Re-audit required |
| Students | search/filter/sort/pagination, create/edit, activate/deactivate/archive/restore, reset password, force logout, overview, learning, attempts, weekly/topics | students | Re-audit required |
| Subjects | global subject creation/order/edit and per-student status/progress/mastery/note | subjects | Re-audit required |
| Notifications | durable inbox, unread filter, pagination, single/read-all, advisor inbox, SSE refresh, push preferences | notifications | Re-audit required |
| System | health/database metadata, SQLite backup/restore, sessions, password, app releases, import history, audit history | system | Re-audit required |
| Deployment | same-origin `/api/v1`, development backend switch, production nginx fallback | shared API/Docker/nginx | Re-audit required |

## Authentication evidence

- Startup `401` becomes anonymous; startup network failure remains in checking state and retries without deleting the possible cookie session.
- Any later protected request returning `401` clears local auth through the shared API failure signal.
- Wrong-role login logs the server session out; failed offline cleanup is queued in session storage.
- Logout is immediate locally and queued for server completion after connectivity returns.
- Login/logout events synchronize across tabs, and visible-page restoration refreshes sessions older than 15 seconds.
- CSRF tokens remain session-scoped and mutating requests retain the one-time CSRF refresh/retry behavior.
- Backend health/version is visible before login; development credentials and backend controls are development-only.

## Retirement gate

Do not remove or redirect the v1.6 admin deployment until all of these pass on the target environment:

1. `npm test` and `npm run build` in `admin-v2`.
2. The backend admin smoke test against a disposable database.
3. Browser smoke: login, select student, create/edit/archive/restore student, save/publish a plan, import JSON, create/edit/delete an exam and question, send/read chat, edit subject progress, download a backup.
4. Restore must be tested only against a disposable deployment because it intentionally replaces the SQLite database and restarts the backend.
5. Compare the route inventory using `npm run audit:parity`; any v1-only protected endpoint must be explicitly explained here before retirement.

The v1.6 directory remains a frozen rollback reference during rollout. The production switch should point the admin domain to `admin-v2`; deletion can happen in a later release after monitored acceptance.
