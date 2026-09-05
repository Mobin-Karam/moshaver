# v1.4 to v2 migration verification

Run v2 migrations against a new target file, then invoke `backend-v2`'s `npm run migrate:v1`. Always pass an explicit legacy organization name. Pass `--platform-owner-username=<trusted-v1-admin>` only after independently confirming that account is the platform owner; use `none` to keep every legacy admin organization-scoped. The source database is opened read-only, sessions are not copied, and users must sign in again.

## Integrity gate

- Preserve the generated `migration-report.json` with the source backup and release evidence.
- Require `success: true`, `sourceReadOnly: true`, `sessionsMigrated: false`, and zero for every integrity check.
- Run the command a second time and require every `inserted` count to be zero.
- Compare source/target counts for students, plans, tasks, study sessions, learning records, exams, quizzes/questions/attempts, chat messages, notifications, releases, and audit history. Review every reported skipped row.

## Admin portal representative accounts

Log in separately as Guardian, Advisor, Teacher, Mentor, Content Manager, Organization Admin, and Platform Admin. Verify the account context, organization selector, navigation visibility, denied deep links, dashboard, and every permitted mutation. Legacy roles absent from the source must be created through v2 user administration solely for this test; do not fabricate migration relationships. Confirm Guardian/Advisor/Teacher/Mentor student visibility using explicit active relationships and verify unrelated students are denied.

## Migrated student account

Force re-login and verify the persistent student ID matches the v1 profile. Exercise login, today, plans/tasks, study start/pause/finish, exams, learning/reviews, notifications, direct/group chat, and an offline mutation followed by sync/reconciliation. Confirm no local record is reassigned to another student and no v1 session remains usable.

## Operational cutover

Keep `/api/v1` and `/api/v2` available until the final gate. Take a fresh immutable v1 backup, rehearse on a disposable target, retain the previous target for rollback, freeze writes only during the final migration window, and do not delete v1 source after switching clients.
