# Admin v2 API compatibility

The target contract is the existing `admin-v2` client contract with the same
path after either `/api/v1` or `/api/v2`. Response bodies use the shared
`{ ok, data }` envelope.

## Native v2 coverage

- Authentication and session management
- Student list, create, edit, archive, overview
- Planner range listing, create, update, delete, duplicate and publish
- Planner task create, update, reschedule and delete
- Import preview and commit
- Exam list/create/update/delete
- Exam question list/create/update/delete/import
- Student exam attempt history and review
- Basic direct chat conversations/messages/read state
- Notifications list/read state
- Reports, realtime events, sync and study sessions

## Remaining parity work

- Subject catalog and student-subject state
- Quiz CRUD and quiz-question management
- Exam syllabus and retry-request workflows
- Group chat members, roles, permissions, reactions, edits, mute and leave
- Admin notification inbox/preferences/push subscription routes
- Realtime student-monitor snapshot
- Audit history, application releases, import history and database operations
- Full dashboard/advisor-inbox metrics instead of placeholder summaries

Student lifecycle actions, password reset/session revocation, weekly/topic detail,
and durable learning-item CRUD/review history are now implemented. They remain
behind the production cutover gate until disposable API and browser smokes pass.
The ordered gap matrix is maintained in
`docs/migrations/admin-v2-api-gap-plan.md`.

These remaining routes must not be treated as complete merely because the v1
service remains available beside v2. Keep `VITE_API_VERSION=v1` as the
production default until the parity list is empty and contract tests pass.
