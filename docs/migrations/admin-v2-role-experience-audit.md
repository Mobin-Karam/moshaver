# Admin v2 role experience audit

Date: 2026-09-06
Branch: `feat/v2-parity-completion`

Snapshot notice: this document records the 2026-09-06 audit. For current behavior use the [capability matrix](../ADMIN_V2_CAPABILITY_MATRIX.md), [Admin v2 component guide](../components/admin-v2-application.md), and current source.

## Role coverage

| Role | Development account | Primary experience | Verified dashboard contract |
| --- | --- | --- | --- |
| Guardian | `e2e.guardian.a` | Children, plans, exams, progress, messages | children, assigned students, unread conversations |
| Advisor | `e2e.advisor.a` | Planning, learning, recovery, retries, live attention | attention, task issues, recovery, retries, plan health |
| Teacher | `e2e.teacher.a` | Assigned subjects, exams, questions, quizzes, student performance | subjects, results, mistakes, content totals |
| Mentor | `e2e.mentor.a` | Student progress, plans, goals, conversations | progress, goals, messages |
| Content manager | `e2e.content.a` | Subjects, questions, quizzes, exams | content totals, draft and published counts |
| Organization administrator | `e2e.orgadmin.a` | Memberships, staff, students, organization reporting | members, students, staff, account status |
| Platform administrator | `e2e.platform` | Organizations, users, system, releases, database and audit | platform totals, health, release and security summary |
| Multi-role staff | `e2e.multi` | Switchable advisor and teacher work contexts | server-selected contract for active role |

The audited role accounts used `Moshaver-e2e-2026!`. Current local role-account seed behavior is documented in the [Backend v2 service guide](../components/backend-v2-service.md); production seeding remains prohibited.

## UX corrections

- Replaced the single legacy dashboard projection with role-specific titles, metrics and quick actions.
- Stopped unauthorized attention and retry-request queries for roles without those capabilities.
- Added a persistent role and organization context bar.
- Added Persian role-aware portal labels in desktop and account navigation.
- Added one-click development login profiles for every Admin v2 role and multi-role testing.
- Made learning, exams and planner workflows read-only when the active role lacks mutation capabilities.
- Removed inaccessible student workspace links and the invalid `/admin/dashboard` destination.
- Added a recoverable direct-URL authorization screen with a dashboard escape action.
- Improved dark-mode surfaces for account, desktop and mobile navigation.

## Current verification

- Authenticated `/me/context` and `/dashboard` returned 200 for all eight development profiles.
- Each role-specific dashboard response was inspected against the UI model.
- `npm run seed:demo` completed against the disposable SQLite database.
- Production build contained no demo username or password strings.
- Browser visual testing remains pending because the in-app browser runtime has no installed browser.
