Your current capability matrix shows that the backend/API integration is already broad: authentication, roles, students, planner, exams, questions, chat, notifications, reports, organizations, and live operations are represented. The next phase should therefore be treated as a **product-completion and role-experience redesign**, not another endpoint-parity exercise.

One adjustment to your proposed order: you already have guarded development role accounts and security-matrix seeding. Do not replace that. Extend it into a **realistic product/demo dataset** that exercises every UI state and role boundary.

For the exam experience, the research supports using Iranian آزمون آزمایشی/کنکور conventions rather than copying one product. Current systems expose scheduled participation windows, electronic answer sheets, timed exams, final/initial reports, right/wrong/unanswered analysis, rank/taraz-style reporting, question-level timing, trends, and detailed explanations. ([Telegram][1]) Autosaving, question-status navigation, review-before-submit, remaining-time displays, and automatic submission at timeout are also established patterns worth implementing. ([مؤسسه آموزش عالی علامه امینی بهنمیر][2])

I would run the work in these **three large implementation phases**.

## Prompt 1 — Product foundation, realistic seed, roles, Student portal and shared UI repair

You are working on the `moshaver` monorepo on the current API v2 / Admin v2 architecture.

This is an IMPLEMENTATION task, not a read-only audit.

Primary applications:

- `backend-v2`
- `admin-v2`
- student-facing application if already present in the repository
- shared packages/components used by these applications

Do not modify or revive API v1 except for historical reference.

The current v2 security model is already important and MUST be preserved:

- explicit roles and capabilities are authoritative
- organization membership is scoped
- student relationships are scoped
- teacher-subject assignments are explicit
- exam assignment and publication control student access
- conversations require membership
- Platform Admin does not get implicit private conversation visibility
- CSRF/session protections must remain intact
- work-role and organization context switching must remain server-validated

The goal of this phase is to turn the existing technically-complete v2 implementation into a coherent product foundation that can support all roles and future UI work.

# 1. Inspect the current architecture first

Audit the actual source of:

- backend-v2 entities
- migrations
- seed scripts
- roles
- capabilities
- organization membership
- student relationships
- teacher subject assignments
- exam assignments
- `/me/context`
- dashboard contracts
- admin-v2 routing
- navigation
- AuthProvider
- WorkContextBar
- shared UI components
- theme system
- form system
- modal system
- notification system
- tables
- selectors
- date controls
- student picker
- command palette
- loading/error/empty states
- mobile navigation
- student-facing app

Do not assume the audit documentation exactly matches current source.

Source is authoritative.

# 2. Expand development/demo seed into a realistic product seed

The project already has security/E2E role accounts.

Keep them.

Add a richer deterministic product/demo seed that creates realistic interconnected data.

Create at least:

## Organizations

Organization A:

- active
- realistic school/academy data

Organization B:

- active
- completely isolated from A

Optional:

- suspended organization
- organization with minimal data

## Accounts

Create deterministic accounts for:

- Platform Admin
- Organization Admin A
- Organization Admin B
- Advisor A
- Advisor B
- Teacher A mathematics
- Teacher A physics
- Teacher B
- Mentor A
- Content Manager
- Guardian A1
- Guardian A2
- Student A1
- Student A2
- Student A3
- Student B1
- Student B2
- multi-role Teacher + Advisor
- disabled user
- suspended organization member

Create both:

- populated users
- users with empty states

Examples:

Student A1:

- full plan history
- exams
- mistakes
- reports
- learning items
- notifications
- chats
- activity

Student A2:

- new student
- almost no data

Student A3:

- missed plans
- recovery request
- unresolved task issue
- weak exam performance

Student B1/B2:

- equivalent records for cross-organization isolation testing

## Relationships

Create explicit:

- Guardian -> Student
- Advisor -> Student
- Mentor -> Student
- Teacher -> Subject -> Organization
- Organization membership
- multi-role assignments

Include:

- active
- revoked
- pending
- rejected
- expired when model supports it

## Academic data

Seed:

- grades
- majors/streams if supported
- subjects
- chapters
- lessons/topics
- subject teachers
- student subject configuration
- plans
- tasks
- study sessions
- learning/review items
- daily reports
- task issues
- recovery requests
- recommendations
- mistakes

## Exam data

Create:

1. Draft exam
2. Scheduled exam
3. Published upcoming exam
4. Active exam
5. Completed exam
6. Exam assigned to one student
7. Exam assigned to multiple students
8. Organization-wide test when supported
9. Teacher-specific subject exam
10. Konkur-style multi-subject mock exam
11. Quiz
12. Exam with retry request
13. Exam with syllabus
14. Exam with no attempts
15. Exam with completed attempts and results

Seed enough questions for useful UI testing.

Questions should vary by:

- subject
- chapter
- topic
- difficulty
- correct option
- explanation
- source
- tags
- exam usage

## Communication data

Seed:

- direct conversations
- group conversations
- unread messages
- read messages
- reactions
- replies
- durable notifications
- advisor notifications
- system notifications

Do not give Platform Admin implicit chat membership merely because they are Platform Admin.

# 3. Make seeding safe

The product seed must NEVER silently run against production.

Require explicit guards such as:

- `NODE_ENV !== production`
- explicit `ALLOW_DEMO_SEED=true`
- disposable/test/development DB validation

Abort with a clear error otherwise.

Seed must be:

- deterministic
- rerunnable where practical
- transactional where practical
- documented

Provide commands such as:

`npm run seed:demo`
`npm run seed:roles`
`npm run seed:reset-demo`

Do not destroy arbitrary databases.

# 4. Define the product boundaries between Admin v2 and Student app

Establish this architecture explicitly:

## Admin v2

Admin v2 is the staff/operations portal.

Used by:

- Advisor
- Teacher
- Mentor
- Content Manager
- Organization Admin
- Platform Admin
- authorized multi-role staff

Guardian may enter Admin v2 only if there is a concrete product reason; otherwise place Guardian in the Student/Family portal.

## Student / Family app

This application should support multiple presentation modes using capabilities.

### Student mode

Student can perform their own allowed actions:

- view dashboard
- view plans
- complete tasks
- study-session actions
- take assigned exams
- view results
- learning/review workflow
- reports
- recovery requests
- mistakes
- notifications
- chat
- personal profile/settings

### Guardian mode

Guardian sees only explicitly related children.

Guardian is primarily read-only.

Guardian can:

- select related child
- see today/weekly progress
- see plan summaries
- see exam schedule
- see released exam results
- see attendance/activity summaries if backend allows
- see learning progress
- see appropriate reports
- see notifications addressed to Guardian
- participate in conversations only where membership exists

Guardian must NOT inherit:

- student mutation privileges
- private student chats
- teacher/advisor tools
- unrestricted student records

### Optional observer/read-only mode

If backend relationships support other observers, build this by capability, not by hard-coded role.

# 5. Create a role experience contract

Create a central frontend configuration describing:

- role
- capability
- navigation groups
- dashboard widgets
- quick actions
- allowed entity scopes
- read/write level
- organization scope
- student scope

Do NOT implement frontend authorization by checking strings such as:

`role === "PLATFORM_ADMIN"`

except where the UI literally needs a role label.

Use capabilities for functional access.

Example conceptual helpers:

- `can("students.read")`
- `can("students.update")`
- `can("exams.create")`
- `can("questions.manage")`
- `can("organizations.manage")`

Add scope helpers where appropriate:

- platform
- organization
- related students
- assigned subjects
- self

# 6. Repair the Admin v2 shared UI system before rebuilding feature pages

The current shared UI components are considered unreliable/inconsistent.

Perform a full source audit.

Create or repair a coherent UI foundation.

Expected primitives:

- Button
- IconButton
- Input
- Textarea
- Select
- SearchInput
- Checkbox
- Radio
- Switch
- Badge
- StatusBadge
- Avatar
- Card
- StatCard
- EmptyState
- ErrorState
- LoadingState
- Skeleton
- Alert
- Tooltip
- Popover
- DropdownMenu
- Tabs
- Modal/Dialog
- ConfirmDialog
- Drawer
- Sheet
- Table
- DataTable
- Pagination
- FilterBar
- Toolbar
- FormField
- DatePicker
- DateRangePicker
- PersianDateDisplay
- StudentPicker
- UserPicker
- OrganizationPicker
- SubjectPicker
- CommandPalette
- Breadcrumbs
- PageHeader
- SectionHeader
- MobileBottomBar where appropriate

# 7. Shared component requirements

Every component must support:

- Persian RTL
- light mode
- dark mode
- system theme
- keyboard operation
- visible focus
- ARIA labeling
- loading
- disabled
- validation
- error states
- mobile viewport
- long Persian text
- destructive action style
- reduced-motion preference where relevant

Avoid giant component files.

Break complex components into:

- model/types
- hooks
- primitives
- presentation components
- domain adapters

# 8. Standardize design tokens

Do not scatter arbitrary Tailwind colors.

Preserve and improve the existing design tokens.

Create consistent semantic tokens for:

- page
- card
- elevated surface
- muted surface
- border
- text
- secondary text
- brand
- success
- warning
- danger
- information
- focus
- selected state

Components must work in dark and light mode without individual hacks.

# 9. Create consistent page states

Every backend-driven workspace must implement:

- initial skeleton
- fetching
- refreshing
- empty state
- filtered-empty state
- authorization-unavailable state
- recoverable error
- retry
- mutation busy state
- success feedback
- destructive confirmation where necessary

Never render a blank panel.

# 10. Add reusable CRUD UX patterns

Create common patterns for:

- create
- edit
- view
- archive
- restore
- activate
- suspend/deactivate
- delete where supported
- bulk select
- bulk operation
- filters
- sorting
- pagination
- search
- status
- audit metadata

Prefer:

desktop:

- efficient table/list + side detail panel

mobile:

- cards + bottom sheet/drawer

Do not force desktop tables onto narrow screens.

# 11. Forms

Standardize:

- inline validation
- server error mapping
- submit by keyboard
- unsaved-change protection
- destructive confirmation
- reset/cancel
- optimistic updates only when safe

Dates presented to Iranian users should use Persian/Jalali display while preserving canonical API date formats.

# 12. Tests

Add tests for:

- role-based navigation
- capability visibility
- multi-role context switching
- organization context switching
- seed isolation
- dark/light components
- keyboard interaction
- critical shared components
- student/guardian portal modes

Run:

backend lint/tests/build
admin lint/tests/build
student-app tests/build if available
parity audit
security tests where environment permits

# 13. Deliverables

Implement the changes.

Then return:

1. changed architecture
2. seed accounts/data summary
3. new shared component inventory
4. role matrix
5. Admin vs Student portal boundary
6. migrations/API changes if any
7. tests added
8. commands run
9. remaining product gaps

Do not claim something works unless verified.

Do not weaken existing security to simplify UI implementation.

This phase should happen first because later pages should use a stable design system and realistic data rather than being designed against empty fixtures.

## Prompt 2 — Full Admin v2 role workspaces, Platform/Organization administration and Education Center

Continue from the completed Phase 1 foundation.

This is a full Admin v2 product-completion implementation.

Goal:

Transform `admin-v2` from a collection of API consumers into a role-aware operational application where every staff type has a useful workspace and authorized administrators can actually manage their allowed domain.

Do not rebuild authorization.

Use backend-v2 capabilities and scope.

# 1. Role experience model

Design explicit product experiences for:

- Platform Admin
- Organization Admin
- Content Manager
- Teacher
- Advisor
- Mentor
- multi-role staff

Every role needs:

- relevant dashboard
- relevant navigation
- relevant quick actions
- useful default landing page
- no inaccessible clutter
- no unnecessary network requests
- read-only states where appropriate
- clear organization/work-role context

# 2. Platform Admin workspace

Platform Admin should be able to manage platform-level data across organizations when backend capabilities allow it.

Create a Platform Operations workspace.

Include:

## Organizations

- list
- search
- filter
- create
- inspect
- edit
- activate/suspend where supported
- membership summary
- student count
- staff count
- status
- recent activity
- organization configuration

## Users

- global search
- role filtering
- organization filtering
- active/disabled states
- create
- inspect
- edit
- role assignment
- organization assignment
- activate/deactivate where supported
- force logout where supported
- session/security actions where permitted

## Students

Platform administrator may administer students cross-organization when capability permits.

Expose:

- organization
- relationships
- profile
- status
- plan state
- education summary
- account lifecycle

Do not give Platform Admin private conversation access merely because of platform role.

Chat remains membership-scoped.

## Content

Global content management:

- subjects
- questions
- quizzes
- reusable exam content
- tags/topics
- syllabus structures where global

## System

- health
- readiness
- versions
- releases
- database metadata
- backup
- restore
- sessions where supported
- audit history
- security events
- import history

Database restore must have extremely strong confirmation UX and must preserve backend safety restrictions.

# 3. Organization Admin workspace

Organization Admin is a mini-administrator inside ONE active organization context.

Allow only organization-scoped operations.

Build:

- organization dashboard
- students
- staff
- memberships
- roles allowed within organization
- pending relationships
- teacher assignments
- subject assignments
- organization exams
- reports
- account status
- activity overview

Useful dashboard metrics:

- active students
- active staff
- pending memberships/relationships
- exams this week
- students needing attention
- plan completion
- unresolved operational issues

Never show another organization's data.

Context switching must invalidate/reload correctly.

# 4. Advisor workspace

Build the product around related students.

Advisor dashboard:

- assigned students
- attention queue
- task issues
- recovery requests
- overdue plans
- recent reports
- weak progress
- exam retry requests where capability applies
- unread conversations

Student-centric shortcuts:

- open student
- plan
- reports
- learning
- exams
- analytics
- recommendation
- contact

Advisor must not receive global student lists unless their capability/scope grants it.

# 5. Teacher workspace

Teacher experience must be subject-oriented, not generic admin UI.

Dashboard:

- assigned subjects
- upcoming exams
- draft exams
- questions requiring work
- recent results
- topic weaknesses
- students visible through valid relationship/assignment rules

Teacher tools:

- question bank
- quizzes
- exams
- exam results
- syllabus
- subject analytics

Teacher only sees assigned subjects/organization scope.

# 6. Content Manager workspace

Content Manager has content scope but no automatic private student scope.

Primary navigation:

- subjects
- question bank
- quizzes
- exam templates/content
- syllabus/content taxonomy
- import/export

Do not load:

- student private data
- reports
- advisor inbox
- private conversations

unless separately granted by capabilities.

# 7. Mentor workspace

Mentor experience:

- related students
- goals/progress
- plans
- learning progress
- released exam results
- conversations where member
- recommendations appropriate to mentor

Respect read/write capabilities.

# 8. Rebuild the Education section as an Education Center

Create a coherent top-level education workspace rather than unrelated pages.

Recommended navigation:

Education
├── Overview
├── Exams
├── Question Bank
├── Quizzes
├── Subjects
├── Syllabus
├── Results
└── Retry Requests

Use capability filtering.

# 9. Education overview

Create useful cards:

- exams scheduled today
- upcoming exams
- draft exams
- published exams
- completed exams
- active attempts
- pending retry requests
- question bank total
- questions missing explanations
- subject distribution
- recent result trends

Provide quick actions:

- Create exam
- Create question
- Import questions
- Create quiz
- View retry requests

# 10. Redesign exam administration

Exam list needs:

- search
- subject filter
- organization filter when allowed
- status
- publication
- assignment type
- date
- attempt status
- creator
- sorting
- pagination
- bulk actions

Use useful status categories:

- Draft
- Scheduled
- Available
- In progress
- Closed
- Results pending
- Results released
- Archived

Map these carefully to backend state; do not invent persistent states if they do not exist.

# 11. Exam creation wizard

Replace an oversized form with a step-based workflow.

Step 1 — Identity

- title
- description
- exam type
- subject/s
- organization
- academic grade
- instructions

Step 2 — Schedule

- date
- start/open time
- close time
- duration
- result release policy
- attempt limits

Step 3 — Scoring

Support when backend allows:

- positive score
- negative marking
- unanswered score
- question weight
- section weighting
- pass threshold

Konkur-style negative marking must be configurable, not hard-coded globally.

Step 4 — Questions

Allow:

- choose existing questions
- create new question
- bulk import
- reorder
- preview
- remove
- filter bank

Step 5 — Assignment

This is critical.

Support assignment scope allowed by backend:

- one student
- selected students
- all eligible students in organization
- subject/teacher-linked students when domain model supports it

If the product requires these additional scopes and backend-v2 cannot express them safely, extend backend-v2 with explicit assignment models rather than faking them in frontend.

Potential future assignment targets:

- grade
- class/cohort
- organization
- educational group

Any backend extension must include migration, authorization and E2E isolation tests.

Step 6 — Review

Show a complete summary before save/publish.

Actions:

- Save draft
- Schedule
- Publish

# 12. Question bank redesign

Create a proper reusable question management system.

Question list:

- subject
- chapter
- lesson
- topic
- difficulty
- type
- source
- tags
- usage count
- status
- explanation status

Search Persian text correctly.

Support bulk selection.

Actions depending on permissions:

- create
- edit
- duplicate
- archive/delete
- add to exam
- add to quiz
- export

Question editor should support current backend fields.

Where backend safely supports or can be extended:

Question types:

- four-choice
- true/false
- short answer
- numeric
- descriptive

Do not add unsupported types solely in frontend.

For four-choice questions support:

- question body
- optional media
- options
- correct answer
- detailed explanation
- hint
- difficulty
- subject taxonomy
- source
- tags

# 13. Konkur-style exam management

Add an optional exam mode:

`CONCOURS / KONKUR MOCK`

This mode should support the concept of:

- multiple subject sections
- ordered sections
- per-section question counts
- optional section timing
- negative marking
- answer-sheet style student UI
- rank/taraz reporting if statistically valid

Do NOT invent fake rank or taraz.

If there is not enough cohort data or backend calculation:
show:

"اطلاعات کافی برای محاسبه تراز وجود ندارد"

rather than generating a meaningless value.

# 14. Exam assignments

Create a clear assignment manager.

For every exam show:

- assignment count
- who is assigned
- assignment source/type
- publication state
- attempt count
- absent/not-started count where derivable

Allow authorized users to:

- add assignment
- remove assignment
- bulk assign
- search students

Protect already-started exams from unsafe assignment mutations according to backend policy.

# 15. Results workspace

Build both:

## Exam-level analytics

- participants
- absent/not-started
- completed
- average
- median if calculable
- correct/wrong/unanswered
- subject breakdown
- question difficulty/performance
- weakest questions
- strongest questions
- time usage if recorded
- score distribution

## Student result

- score
- percent
- correct
- wrong
- unanswered
- unseen where distinguishable
- subject performance
- question review
- explanation
- mistakes
- attempt history

For Konkur mode show rank/taraz only when backend produces valid values.

# 16. Question analytics

Question rows should optionally show:

- answer rate
- correct rate
- wrong rate
- unanswered rate
- discrimination/difficulty metrics if backend supports them
- average time if captured

Do not manufacture statistics.

# 17. Bulk operations

Where safe:

Exams:

- publish
- draft/unpublish
- archive/delete
- assignment

Questions:

- add to exam
- tag
- export
- archive/delete

Always require confirmation for destructive bulk operations.

# 18. Student administration UX

Rebuild Students into a proper management workspace.

Directory:

- fast search
- filters
- sort
- pagination
- organization
- status
- assigned advisor
- grade/subject context where available

Student detail navigation:

Overview
Activity
Plans
Learning
Exams
Reports
Mistakes
Recommendations
Security
Relationships

Only show tabs allowed by active capability.

# 19. Organizations and users

Replace thin CRUD forms with complete workflows.

Organization page should contain:

- overview
- members
- students
- relationships
- teachers/subjects
- education
- reports
- settings

User detail should show:

- identity
- status
- memberships
- roles
- relationships
- session/security information when allowed
- recent administrative audit activity

# 20. Responsive behavior

Admin v2 must work down to tablet/mobile for operational use.

Desktop:

- dense efficient workspaces

Tablet:

- adaptive two-column

Phone:

- list/card
- drawers
- sticky primary actions

Never hide important operations simply because screen is small.

# 21. Performance

Use:

- route lazy loading
- query caching
- pagination
- debounced searches
- request cancellation
- targeted invalidation

Do not refetch all unrelated data after every mutation.

# 22. Testing

Test at least:

Platform Admin:

- cross-org management
- no implicit private chat visibility

Organization Admin:

- organization CRUD scope
- cannot cross organization

Teacher:

- assigned subjects only

Advisor:

- related students only

Content Manager:

- content works
- no private student workspace

Mentor:

- related student read/write level

Multi-role:

- role switch changes workspace and requests

Education:

- exam CRUD
- assignment
- question CRUD
- publish
- result viewing
- retry moderation

Run complete existing release gates afterward.

# 23. Documentation

Update the current capability matrix based on SOURCE + verified behavior.

Add a second product-focused document:

`docs/ADMIN_V2_PRODUCT_READINESS.md`

Unlike endpoint parity, evaluate:

- workflow completeness
- role usefulness
- responsive UX
- empty/error/loading behavior
- accessibility
- destructive safety
- browser verification

# Deliver

Implement everything practical in this phase.

Do not stop after writing an audit.

If backend-v2 needs a small canonical extension to make a real workflow possible, implement it with:

- DTO
- service
- authorization
- migration if needed
- API test
- frontend consumer
- UI
- tests

Do not create `/admin/*` compatibility placeholders.

Use canonical API v2 routes.

## Prompt 3 — Student/Family app + mobile-first Iranian/Konkur exam system

Continue after the Admin v2 and seed/shared-UI phases.

This phase focuses on the student-facing application.

Goal:

Build a polished mobile-first Student/Family experience and completely redesign exam-taking around modern mobile assessment UX and familiar Iranian آزمون آزمایشی / کنکور conventions.

This is not merely a visual redesign.

The system must protect answers, timing, authorization and exam integrity under unreliable mobile connectivity.

# 1. Product modes

The student-facing application must support capability-driven modes.

## Student

Student may:

- view own dashboard
- view plans
- manage allowed task completion
- use study sessions
- view learning/reviews
- take assigned exams
- view released results
- view mistakes
- submit reports
- request recovery/retry where allowed
- use notifications
- use conversations where member

## Guardian

Guardian:

- chooses among explicitly related children
- sees only permitted read-only educational information
- sees released results
- sees progress
- sees plan summaries
- receives Guardian notifications
- participates only in conversations where explicitly a member

Guardian must not be able to answer exams, complete student tasks, alter reports, or impersonate the child.

# 2. Mobile-first shell

Design for phone first.

Target:

- 360px+
- thumb-friendly controls
- Persian RTL
- safe-area support
- PWA-friendly behavior
- dark/light/system theme
- low network conditions

Student navigation should be simple.

Recommended bottom navigation:

- امروز
- برنامه
- آزمون‌ها
- گفتگو
- بیشتر

Use badges for unread/attention counts.

Do not place ten destinations in mobile navigation.

# 3. Student dashboard

Dashboard must answer:

"What should I do now?"

Top:

- greeting
- current date
- active study status
- urgent exam
- next task

Then:

- today progress
- remaining study
- upcoming exam
- reviews due
- recent advisor message
- unresolved issue
- small weekly trend

Avoid generic admin-style KPI cards.

# 4. Exam home

Create a dedicated exam center.

Sections:

## اکنون

- active/resumable exam

## پیش رو

- upcoming assigned exams

## نتایج

- completed exams with released results

## نیازمند اقدام

- retry/recovery
- incomplete submission
- exam issue if supported

Each exam card shows:

- title
- subjects
- date
- opening time
- closing time
- duration
- question count
- state
- attempt status

Do not show a Start button before the exam is legally available.

# 5. Pre-exam screen

Before beginning, show a calm full-screen preparation page.

Display:

- exam title
- number of questions
- subjects/sections
- duration
- start/end availability
- scoring model
- negative marking if enabled
- attempt count
- instructions
- result release policy

Add a preflight check:

- authenticated session valid
- exam assigned
- exam published
- within allowed window
- connection status
- browser storage available
- existing attempt/resume state

Require explicit:

"قوانین آزمون را خواندم"

Then:

"شروع آزمون"

Do NOT start timing merely because the student opened exam details.

# 6. Exam modes

Support presentation based on exam configuration.

## Standard school exam

Could use:

- one question per page
  or
- compact list when appropriate

## Konkur-style mock exam

Use:

- subject/section booklet structure
- answer-sheet navigation
- numbered question palette
- clear answered/unanswered/marked status
- total/section timer

Do not pretend to reproduce the official national exam software exactly.

The goal is familiar Iranian exam behavior.

# 7. Mobile exam screen

The exam-taking screen must minimize distraction.

Persistent header:

- exam title or section
- remaining time
- connection/save status

Main:

- question number
- question
- media
- answers

Footer:

- previous
- mark/review
- next

Keep tap targets large.

Do not use tiny radio inputs.

Answer choices should be full-width selectable cards.

# 8. Question statuses

Support clearly distinguishable states:

- current
- unanswered
- answered
- marked for review

After question has been visited, optionally differentiate:

- seen but unanswered

Do not rely on color alone.

Use icon/text/shape as well.

# 9. Question navigator / answer sheet

Create an accessible bottom sheet on mobile.

Show numbered questions grouped by section.

Header summary:

- answered
- unanswered
- marked
- remaining

Allow tap to jump when exam rules allow navigation.

For exam types where backward navigation is forbidden, enforce server/domain configuration and make this clear before starting.

# 10. Answer persistence

This is release-critical.

Every answer should be protected against:

- refresh
- accidental navigation
- temporary connection loss
- app backgrounding
- tab crash where reasonably possible

Use layered persistence:

1. immediate local state
2. durable local browser persistence
3. debounced server autosave
4. retry queue on connection recovery

Show status:

- ذخیره شد
- در حال ذخیره
- آفلاین — ذخیره روی دستگاه
- خطا در همگام‌سازی

Never claim server saved when only local storage succeeded.

# 11. Autosave

Selecting an answer should save automatically.

Do not require a Save button for every question.

Server write should be:

- debounced
- idempotent where possible
- scoped to active attempt
- conflict-safe

On reconnection:

- reconcile local/server state carefully
- never silently discard newer local answer

# 12. Connectivity

Create an exam-specific connectivity indicator.

If connection is lost:

- do not panic the student
- keep usable local attempt where architecture safely supports it
- queue answers
- show offline state

When restored:

- sync automatically
- show confirmation

If backend cannot support safe offline exam behavior, do NOT fake it.

Instead clearly show degraded behavior and protect whatever local state is possible.

# 13. Timer

Timer must use server-authoritative attempt timing.

Do NOT extend time by:

- refreshing
- reopening
- changing device clock
- backgrounding app

UI may interpolate countdown locally, but expiration comes from backend attempt state.

Warnings:

- 15 minutes
- 5 minutes
- 1 minute

Make warnings configurable by duration.

Avoid disruptive modal spam.

# 14. Background/resume

When app returns from background:

- revalidate session
- revalidate attempt
- revalidate server time
- sync pending answers
- recompute remaining time

Do not reset timers.

# 15. Submission flow

Manual submit:

First show a review summary:

- total questions
- answered
- unanswered
- marked

If unanswered questions remain, clearly warn.

Require explicit confirmation.

Do not use a dangerous one-tap final-submit button.

After server confirms submission:

- lock attempt
- clear local pending-answer queue
- show receipt state
- show timestamp/attempt reference if backend provides it

# 16. Timeout submission

When time expires:

- stop editing
- flush pending state where permitted
- server finalizes attempt according to backend contract
- show a clear completion state

Do not rely only on browser JS for enforcement.

# 17. Konkur scoring

Allow exam configuration to define scoring.

Potential configuration:

- correct points
- wrong penalty
- unanswered score

For a common Konkur-style simulation, negative marking may be enabled.

Never hard-code national-exam formulas into all exam types.

UI before exam must clearly tell the student whether negative marking is enabled.

# 18. Sections and subject booklets

Konkur-style exams may group questions by:

- mathematics
- physics
- chemistry
- biology
- literature/humanities/etc according to educational stream

Model sections generically.

Do not hard-code one academic stream.

Each section can display:

- name
- question range
- answered count
- optional allocated time if supported

# 19. Question media

Support responsive:

- images
- formulas
- tables
- long Persian text

Provide zoom for question images.

Do not require horizontal page scrolling.

Math rendering should remain readable on phone.

# 20. Exam accessibility

Support:

- screen readers where feasible
- keyboard navigation on desktop
- sufficient contrast
- visible focus
- large controls
- no color-only statuses
- zoom without breaking layout

# 21. Exam integrity

Do not implement invasive surveillance without an explicit product/legal requirement.

Safe integrity features may include:

- server-authoritative timer
- controlled attempt count
- assignment validation
- question/option randomization if configured
- audit events
- start/submit timestamps
- duplicate submission protection

Do not introduce webcam/proctoring merely for appearance.

# 22. Result availability

Results can have states:

- calculating
- preliminary
- final/released
- withheld/unavailable if backend supports policy

The student should not necessarily see answers immediately after submission.

Admin controls release policy.

# 23. Iranian-style result dashboard

When result is released, create a strong result workspace.

Top:

- score
- percentage
- correct
- wrong
- unanswered
- optionally unseen
- completion time

If valid backend population data exists:

- rank
- organization/school rank
- cohort rank
- percentile
- taraz

Never invent rank/taraz from one student's raw score.

If data is insufficient:

"هنوز داده کافی برای محاسبه تراز و رتبه وجود ندارد."

# 24. Subject analysis

For multi-subject exams:

show each subject:

- percentage
- correct/wrong/unanswered
- time spent if captured
- comparison to prior attempt
- topic weaknesses

Use compact visualizations suitable for phone.

# 25. Question review

After release policy permits review:

Each question shows:

- student's answer
- correct answer
- result state
- explanation
- hint/lesson link if available
- subject/topic
- time spent if captured

Allow:

"افزودن به مرور"

or mistake workflow if API supports it.

# 26. Smart mistake workflow

For wrong/uncertain questions:

Enable student to classify reason where backend supports it:

- بی‌دقتی
- بلد نبودم
- شک بین گزینه‌ها
- کمبود زمان
- محاسبات
- فراموشی

Use existing mistake domain rather than inventing disconnected client data.

Show mistake revision queue.

# 27. Progress trends

Results center should show:

- last exams
- subject trend
- accuracy trend
- time-management trend
- mistake trend
- improvement areas

Only use actual data.

# 28. Guardian exam view

Guardian sees:

- upcoming exams
- attendance/attempt status
- released results
- subject-level summary
- progress trend

Guardian must NOT see:

- active answer sheet
- unreleased question answer keys
- student mutation controls

# 29. Advisor/teacher result consumption

Do not duplicate full Admin v2 inside the student application.

Staff should use Admin v2.

Student/Family app remains learner/observer oriented.

# 30. Admin-to-student workflow verification

Verify complete journey:

Teacher/Content Manager:
create question

Authorized staff:
create exam

Authorized staff:
assign exam to one student

Authorized staff:
publish/schedule

Student:
sees exam

Student:
starts

Student:
answers

Connection:
temporarily interrupted

Student:
continues

Student:
submits

Admin:
sees attempt

Results:
released

Student:
sees result

Guardian:
sees released summary

Then repeat:

exam assigned to multiple students

and:

Konkur-style multi-subject mock exam

# 31. Testing

Unit/component:

- timer
- status palette
- autosave queue
- submit confirmation
- result state
- guardian read-only mode

E2E:

- assigned student allowed
- unrelated student denied
- unpublished exam denied
- expired exam denied
- resume attempt
- timeout
- duplicate submit
- cross-account attempt enumeration denied
- guardian cannot submit
- role switch does not leak data

Mobile browser sizes:

- 360x800
- 390x844
- 412x915

Also test desktop.

# 32. Performance

Exam route should be deliberately lightweight.

Do not load:

- large admin libraries
- unrelated dashboards
- all question media in advance unless intentional

Lazy load media where safe.

Preload next question where useful.

# 33. Persian UX copy

Use concise Persian text.

Examples:

- آزمون‌های من
- شروع آزمون
- ادامه آزمون
- زمان باقی‌مانده
- ذخیره شد
- در حال ذخیره
- بدون اتصال
- علامت برای مرور
- پاسخ داده‌شده
- بدون پاسخ
- مرور پاسخ‌ها
- پایان آزمون
- نتیجه آزمون
- پاسخ تشریحی

Avoid English placeholders in production UI.

# 34. Verification and delivery

Run all relevant:

- lint
- TypeScript
- tests
- accessibility
- build
- API parity
- security E2E
- student E2E
- browser exam E2E when browser exists

Return:

- architecture changes
- screenshots if available
- exam state machine
- autosave design
- mobile UX implementation
- result UX
- Guardian mode
- backend extensions
- migrations
- tests
- remaining environmental checks

Do not report browser/VAPID behavior as passed when it was not actually exercised.

### Why these three phases

The most important architectural change is **not adding more pages**. It is making the product operate as three clear layers:

**Backend v2 → capability/scoping authority**

**Admin v2 → staff and operational management**

**Student/Family app → student actions + explicitly scoped read-only family/observer experiences**

That also avoids the mistake of trying to make every role see the same Admin interface with buttons hidden afterward.

For exams specifically, I would make **Exam Assignment + Exam Runner + Result Analysis** one end-to-end product. Iranian services already train students to expect scheduled windows, answer-sheet-style interaction, detailed post-test reports, rank/taraz-style analytics, and explanatory review. ([Telegram][3]) Your implementation can preserve those familiar concepts while improving mobile reliability with autosave, reconnect/resume and clearer state handling.

[1]: https://t.me/s/gozine2?before=39035&utm_source=chatgpt.com "کانال رسمی موسسه گزینه دو – Telegram"
[2]: https://aab.ac.ir/index.php/about-uni/chart/12-announcements/389-lms?utm_source=chatgpt.com "***راهنمای شرکت در آزمون در سامانه LMS***"
[3]: https://t.me/s/gozine2?before=39033&utm_source=chatgpt.com "کانال رسمی موسسه گزینه دو – Telegram"
