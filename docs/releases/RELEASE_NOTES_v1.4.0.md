<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver | مشاور v1.4.0 — Release Notes

This release is intentionally an **in-place stabilization and feature completion**, not a rewrite. Working v1.3 auth, study sessions, reports, chat transport, SSE and database data are retained.

## Main fixes

- Admin controls that depended on missing modal/import helpers now work.
- Admin session survives normal reload; transient backend/network errors no longer force a fresh login.
- Planner CRUD and JSON preview/commit are wired to the selected student.
- JSON v2 supports timed exams and exam questions in the same import file.
- Exam delivery is backend-enforced: locked before start time, available in window, one base attempt, active-run resume, then retry request → Advisor approval/rejection.
- Student exam screen refreshes automatically at opening/closing boundaries.
- Student and Admin chat UI is cleaner while retaining REST send + one SSE connection.
- Student notifications and Advisor notification center have read/action state and clearer feedback.
- Custom stacked toast cards replace weak one-line feedback without adding Sonner or another dependency.
- Additional custom SVG icons were added without changing the lightweight frontend architecture.

## Existing data

Keep your persistent database:

```env
DATABASE_PATH=/data/konkur.sqlite
```

The migration is additive. Do not delete the DB for this upgrade.

## Deployment order

```text
1. Backend v1.4.0
2. Verify https://api.mahakaram.ir/health → 200
3. Student v1.4.0
4. Accept/force the Student PWA update if an older shell is cached
5. Run Admin with admin-app/run-local-admin.sh
6. Import a small JSON as Draft and verify the selected student
7. Publish a test plan
8. Create a short timed exam and verify the start/retry workflow
```

## Validation performed

The packaged validation suite passed:

- backend syntax/check + comprehensive smoke suite;
- frontend API CSRF recovery test;
- Admin/Student UI contract checks for critical controls/functions;
- Admin `/auth/me` repeated reload-session behavior;
- Student/Admin proxy login → `/auth/me` → logout behavior;
- future exam locked before `openAt`;
- active exam resumes same run;
- submitted base attempt blocks a second base start;
- Student retry request reaches Admin;
- Advisor approval unlocks one additional attempt;
- JSON preview/commit overrides copied `studentId` with selected Admin student;
- JSON exam questions are committed;
- notification read-all;
- chat/SSE/session/activity regression suite;
- all JSON parse checks, shell syntax, low-Android JS syntax scan and pack hygiene;
- Student/Admin Nginx configuration syntax (with a local upstream substituted during validation because the build container does not resolve the production DNS name).
