# Admin v2 product readiness

Last reviewed: 2026-09-13

This document evaluates the current `apps/admin` product workflows against canonical `apps/api` behavior. It is intentionally separate from endpoint parity. “Ready” means the workflow exists, is capability-gated and has automated evidence; it does not imply that every external or browser surface has been manually verified.

## Role workspaces

| Experience | Current product behavior | Readiness |
| --- | --- | --- |
| Platform Admin | Platform dashboard, cross-organization users/organizations, onboarding, system, releases, database and audit operations. Private chat remains conversation-membership scoped. | Ready; destructive database restore still requires disposable-target acceptance evidence. |
| Organization Admin | Active-organization context, scoped dashboard, students, staff/memberships, reports, resources and Education Center. Context changes rebuild request headers and invalidate scoped queries. | Ready in source and automated authorization coverage; browser role-switch smoke remains required for release. |
| Advisor | Related-student dashboard, attention/recovery work, planner, learning, reports, recommendations and membership-scoped chat. | Ready. |
| Teacher | Subject/content-oriented navigation, scoped students, exams, questions, quizzes, subjects, results and Education Center. | Ready in source; subject-assignment isolation is backend-authoritative. |
| Content Manager | Content-only quick actions and navigation; no student, report or private-chat request is made without a separately granted capability. | Ready. |
| Mentor | Related-student progress, plans, released results, resources and membership-scoped conversations according to capabilities. | Ready. |
| Multi-role staff | Active role and organization are explicit in the work-context bar; role-specific navigation and quick actions are recomputed from the active capability set. | Ready in unit/security coverage; full browser transition smoke pending. |
| Guardian | Dedicated family workspace loads linked children, dashboard, progress, schedule, exams, reports, assigned resources and encouragement using the guardian-scoped contracts. | Ready in source and controller-aware parity; browser workflow smoke pending. |

## Education Center

The top-level `/admin/education` route is a real capability-gated workspace. It consumes the canonical organization-scoped exam and retry endpoints and presents scheduled, upcoming, draft, published, active-attempt, completed-attempt, pending-retry and question totals. Subject distribution and attention items are derived only from returned scope. Quick actions are removed when the active role lacks their capability.

Exam and Question Bank lists no longer require a student selection. A student selection is optional context for creating a directly assigned exam and for viewing that student’s attempt history.

Exam assignment management supports searchable bulk assignment, an assignment directory, direct removal, assignment/attempt/not-started counts, exam-scope authorization and student-scope authorization. The API rejects removal after an attempt has started, preserving attempt history.

## Workflow quality

| Area | Evidence and boundary |
| --- | --- |
| Loading, empty and error behavior | Education, assignment, exam and question workspaces render explicit loading, empty and retry states. |
| Responsive behavior | Existing responsive shell plus card/list layouts remain usable at phone and tablet widths; no Education action is hidden solely by viewport size. |
| Accessibility | Semantic headings, named metric regions, native form controls and existing shared focus/modal behavior are used. Run `npm run test:a11y` as a release gate. |
| Destructive safety | Exam deletion retains hold/undo UX. Assignment removal is server-blocked after an attempt starts. Database restore retains its separate strong confirmation and backend restrictions. |
| Data isolation | Canonical endpoints enforce capability plus active organization/student scope. Platform role does not bypass chat membership. Frontend filtering is presentation only. |
| Rank and taraz | Never fabricated. The result UI must keep showing that there is insufficient data until the backend produces statistically valid values. |

## Remaining release evidence

- Run the complete Admin and API unit, accessibility and production-build gates after changes.
- Run role-switch and Education CRUD/assignment/retry workflows in a real browser against a disposable API database.
- Do not mark Web Push delivery or database restore target acceptance complete without their separate production-like/disposable-target checks.
