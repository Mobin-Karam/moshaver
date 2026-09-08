# Admin v2 endpoint and UX audit

Date: 2026-09-06  
Scope: current `backend-v2` controllers and `admin-v2` consumers on `feat/v2-parity-completion`.

Snapshot notice: “current” below means the dated 2026-09-06 checkout. Use the [capability matrix](../ADMIN_V2_CAPABILITY_MATRIX.md) and generated [OpenAPI contract](../components/backend-v2-http-api.md) for the present source.

## Findings and delivered fixes

| Workflow | Backend finding | Admin v2 finding | Resolution | Verification |
| --- | --- | --- | --- | --- |
| Student analytics | `GET /students/:id/analytics` failed with SQLite `ambiguous column name: status` | No analytics consumer | Qualified joined task columns; added the activity-tab analytics workspace | Unit regression and live HTTP 200 |
| Recommendations | Read/create endpoints worked but had no staff UI | No list, empty state, error recovery, or authoring flow | Added permission-aware list and create form to student activity | Live GET 200; Admin build/tests |
| Mistakes | Staff list endpoint worked | No staff visibility | Added read-only open/resolved mistake cards to student activity | Live GET 200; Admin build/tests |
| Organization members | CRUD endpoints worked | Organization page only listed names | Added member picker, role selection, activation/suspension, removal, and request states | Live member list 200; Admin build/tests |
| Relationships | Approval endpoints worked | No approval workspace | Added scoped pending relationship approval/rejection | Live list 200; Admin build/tests |
| Subject teachers | Assign/remove existed without a read endpoint; organization admins could not read subjects | No usable assignment manager | Added scoped assignment listing, corrected `subjects.read` grants, and added the teacher manager | Migration applied to disposable DB; live list 200 |
| App versions | Read/update endpoints worked | An unused read-only component existed | Added active-version loading/error/empty/edit flow and integrated it into System | Live list 200; component regression test |
| Syllabus, retry moderation, quizzes | Endpoints already had current Admin v2 API clients and visible workflows | Migration manifest incorrectly said pending | Corrected manifest evidence | Source audit and parity gate |

## UX acceptance

New workspaces use the existing design system and include responsive layouts, keyboard-submit forms, capability-based action visibility, disabled/busy states, empty states, inline failures, and explicit retry actions. The later Admin operations refresh added confirmation before destructive member removal and relationship rejection.

## Verification record

- Backend v2 build: passed.
- Backend v2 tests: 13 suites, 51 tests passed.
- Backend v2 security-matrix E2E: passed, including role isolation and organization boundaries.
- Admin v2 build: passed (existing PostCSS `from` and large-chunk warnings remain).
- Admin v2 tests: 29 files, 80 tests passed.
- Admin parity audit: 12 areas and 46 required integrations represented.
- Disposable SQLite migration: 33 migrations applied, including `SubjectReadCapabilities1724143000000`.
- Live authenticated HTTP: analytics, recommendations, mistakes, organizations, organization members, relationships, app versions, subjects, and subject teachers returned 200.
- Browser visual QA: not run because the in-app browser runtime reported no available browser installation.
