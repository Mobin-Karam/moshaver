# Moshaver Admin — UI/UX Improvement Migration Prompts (1–3)

> Scope: improve the existing `apps/admin` frontend incrementally **without redesigning the product**.
>
> Execute these prompts in order. The current goal is to improve what already exists. A full UI/UX redesign comes later.

## Global rules for all three migrations

You are working in the Moshaver monorepo on `apps/admin/`.

Before editing code, use the repository's Graphify-first workflow when `graphify-out/graph.json` is available, then verify findings in actual source.

Preserve the current frontend architecture (`app/`, `features/`, `shared/`, `styles/`, `a11y/`), backend APIs, `/api/v2`, business logic, Persian-first RTL behavior, role/context behavior, and existing visual identity.

Do **not** redesign the Admin app. Do not replace the shell, migrate React/Vite/React Router/TanStack Query/React Hook Form/Zod/Tailwind, migrate Tailwind v3 to v4, introduce a new global state library, rewrite working features for style reasons, or add abstractions without real reuse.

Prefer small, reviewable changes. Keep tests green. Add tests when reusable behavior changes. Improve accessibility, light/dark mode, RTL, responsive behavior, loading/error/empty states, interaction feedback, safety, consistency, and reuse.

The target is:

```text
existing UI
   ↓
more consistent
   ↓
more accessible
   ↓
safer interactions
   ↓
cleaner reusable components
   ↓
better UX
```

Not:

```text
existing UI
   ↓
new visual redesign
```

---

# Migration 1 — Audit, Normalize, and Harden the Existing UI

## Goal

Improve the UI that already exists without changing its overall design.

## Prompt

```text
You are a senior frontend engineer and UI/UX systems engineer working on the existing Moshaver Admin frontend.

Repository area:
apps/admin/

This is Migration 1 of an incremental UI/UX improvement plan.

IMPORTANT:
This is NOT a redesign.
Do not create a new visual language.
Do not replace the current shell, page structures, or product identity.
Do not rewrite features.
Improve what is already there.

Start with a source-backed audit of the current Admin frontend.

Use Graphify first if graphify-out/graph.json exists, then verify findings in actual source.

Audit at minimum:

1. apps/admin/src/shared/ui/
2. apps/admin/src/app/layout/
3. apps/admin/src/styles/globals.css
4. apps/admin/src/shared/theme/
5. apps/admin/src/features/
6. apps/admin/src/a11y/
7. reusable forms
8. reusable tables
9. modals/dialogs
10. notifications/toasts
11. loading states
12. error states
13. empty states
14. role/context indicators
15. mobile behavior
16. RTL behavior
17. dark/light mode
18. keyboard/focus behavior

Look specifically for:

- duplicated component styles
- inconsistent spacing, heights, border radii, labels, and actions
- missing helper/error text
- missing loading feedback
- buttons that allow duplicate submissions
- consequential/destructive actions without adequate confirmation
- actions that only show feedback through toast
- unclear disabled states
- weak focus-visible states
- poor keyboard interaction
- missing accessible labels
- icon-only controls without accessible names
- inconsistent empty/error/loading states
- content jumping during loading
- unnecessary scrolling
- mobile overflow
- RTL bugs
- Persian/English mixed-content problems
- hardcoded colors that bypass current tokens
- light-only or dark-only styling
- duplicated Tailwind class blocks
- components that mix primitive UI behavior with feature business logic
- shared components that are actually feature-specific
- local feature patterns that should use an existing shared component
- existing shared components that are underused
- role/context state that is too easy to misunderstand

Do not make speculative large changes.

After the audit, implement only low-risk improvements that make the existing UI more consistent and usable.

Prioritize:
A. interaction safety
B. accessibility
C. consistency
D. dark/light correctness
E. RTL correctness
F. loading/error/empty feedback
G. responsive behavior
H. removing duplicate UI behavior

Keep the existing colors, visual identity, component style, layout concept, and UX structure unless something is clearly broken.

Continue using current CSS variables such as:
- --color-ink
- --color-paper
- --color-brand
- --color-brand-strong
- --color-brand-soft
- --color-saffron
- --color-rosewood
- --surface-card
- --surface-muted
- --surface-raised
- --border-subtle

Do not replace these with a new theme system in this migration.

For every change:
- identify the existing problem
- make the smallest appropriate fix
- preserve API/business behavior
- add/update tests when behavior changes

Run:
- typecheck
- lint
- unit tests
- accessibility tests
- relevant Playwright tests if available

Deliverables:

1. Concise audit report grouped into:
   - critical UX issues
   - accessibility issues
   - consistency issues
   - RTL/dark-mode issues
   - maintainability issues
   - deferred redesign opportunities

2. Implemented low-risk fixes.

3. Create:
   apps/admin/docs/ui-ux/MIGRATION-1-AUDIT.md

The report must clearly separate:
- FIXED NOW
- KEEP AS-IS
- DEFER TO REDESIGN

Do not start Migration 2 automatically.
```

---

# Migration 2 — Strengthen Existing Shared UI Components

## Goal

Turn the components already used by the application into a stronger, more consistent reusable layer. This is still **not a redesign**.

If a shadcn/Base UI/Radix-style primitive is useful internally for accessibility or interaction behavior, it must remain an implementation detail behind Moshaver-owned components. The UI must not become visually recognizable as shadcn.

## Prompt

```text
You are continuing the Moshaver Admin frontend improvement work.

This is Migration 2.

Read:
apps/admin/docs/ui-ux/MIGRATION-1-AUDIT.md

Then inspect the current source before editing.

IMPORTANT:
Do not redesign the Admin UI.
Preserve its visual identity and current screen structures unless fixing a real usability problem.

Focus on strengthening the existing shared UI layer:
apps/admin/src/shared/ui/

Current reusable patterns include components such as:
- Button
- Card
- Input
- Textarea
- Select
- Badge
- EmptyState
- LoadingState
- Field
- Modal
- AdminDataTable
- StudentPicker
- DatePicker
- notification UI
- management workspace patterns

First determine actual usage across the application.

Do not blindly split every file.
Do not create dozens of tiny components without real consumers.
Improve components in-place where possible.

Required improvements:

1. Button
- consistent existing sizes/variants
- loading behavior
- disabled behavior
- aria-busy
- prevention of accidental duplicate submit where appropriate
- accessible names for icon-only buttons
- consistent focus-visible behavior

2. Inputs
- consistent height
- focus state
- invalid state
- disabled/read-only state
- aria-invalid
- aria-describedby
- dark/light correctness
- RTL correctness

3. Field
- label association
- required indication
- description/help text
- error text
- deterministic IDs where needed
- correct input/error/help relationships

4. Select / picker controls
- predictable keyboard behavior
- accessible labels
- loading/empty states
- clear/reset behavior where already supported
- no visual redesign

5. Card / surfaces
- normalize repeated border/background/shadow behavior
- reduce duplicated one-off classes
- do not turn every section into a Card

6. Badge/status
- normalize semantic status behavior
- do not communicate status by color alone
- preserve current visual appearance as much as possible

7. LoadingState / EmptyState / ErrorState
- create a consistent shared contract if missing
- support useful title/description/action patterns
- avoid layout jumps
- avoid vague generic messages when product context is known

8. Modal/dialog behavior
- focus trapping
- Escape handling
- initial focus
- return focus to trigger
- accessible title/description
- correct scrolling
- mobile behavior
- destructive confirmations
- preserve business logic

9. Toast/notifications
- toast is supplementary feedback
- important state changes must also appear in affected UI when practical
- prevent duplicate/noisy notifications

10. DatePicker
- preserve Persian calendar display
- preserve Gregorian/ISO API contract
- safely handle invalid dates
- enforce from/to constraints
- consistently display Shamsi dates
- improve keyboard/accessibility behavior without redesign

11. AdminDataTable
Improve existing functionality only:
- loading
- empty
- error
- selection
- sorting indicators
- responsive overflow
- sticky header only if safe and useful
- semantic table markup
- keyboard/focus behavior
- do not add a large table framework without a real requirement

Architecture rule:
Feature code should consume Moshaver-owned components.

If using shadcn, Radix, or Base UI concepts:
- use them only when they materially improve accessibility/interaction
- keep them behind Moshaver component APIs
- preserve Moshaver styling
- do not make the UI visually recognizable as shadcn
- do not add many unused primitives
- add only primitives with current real usage

Do not create packages/ui yet.
Keep the work inside apps/admin/src/shared/ui/ unless a small helper clearly belongs elsewhere.

Testing:
Add/improve tests for updated reusable components covering as appropriate:
- keyboard interaction
- focus
- loading
- disabled state
- invalid forms
- accessible labels
- dialog open/close
- RTL-sensitive behavior

Run:
- typecheck
- lint
- unit tests
- test:a11y
- relevant e2e tests

Deliverables:

1. Improved shared UI implementation.
2. No broad visual redesign.
3. No backend/API changes.
4. No feature rewrite.
5. Create:
   apps/admin/docs/ui-ux/MIGRATION-2-COMPONENTS.md

Document:
- components improved
- API changes, if any
- deprecated patterns
- migration examples
- remaining debt
- items intentionally deferred to full redesign

Do not start Migration 3 automatically.
```

---

# Migration 3 — Improve Existing Admin UX Patterns and Feature Consistency

## Goal

After the primitives are stronger, improve how existing Admin pages use them.

Do not redesign pages, replace the shell, or change the product's visual language. Make existing workflows easier, safer, faster, and more consistent.

## Prompt

```text
You are implementing Migration 3 of the Moshaver Admin incremental UI/UX improvement plan.

Read first:
apps/admin/docs/ui-ux/MIGRATION-1-AUDIT.md
apps/admin/docs/ui-ux/MIGRATION-2-COMPONENTS.md

Inspect current source and real feature usage before editing.

IMPORTANT:
This is the final pre-redesign improvement migration.
Do NOT perform the future UI redesign.
Do NOT replace the application shell.
Do NOT change the visual identity.
Do NOT rewrite feature business logic.

The goal is to make the current Admin application feel more coherent and trustworthy using existing components and patterns.

1. Page consistency

Audit current pages and normalize where appropriate:
- title
- description
- primary action
- secondary actions
- filters
- search
- content
- loading
- error
- empty state
- pagination/footer information

Do not force every page into an identical layout. Normalize only genuinely repeated patterns.

2. Reduce unnecessary scrolling

For existing screens:
- move frequent actions closer to affected content
- avoid duplicate headers/actions
- keep important controls visible where reasonable
- collapse low-priority information when appropriate
- remove giant empty spacing
- improve responsive layouts
- do not redesign the information architecture

3. Safer actions

Classify actions:
A. reversible UI action
B. normal save/update
C. consequential action
D. destructive action

Improve feedback accordingly.

Normal updates:
- pending state
- disable duplicate submit
- inline success/error where useful

Consequential actions:
- contextual confirmation

Destructive actions:
- clear impact
- explicit destructive styling
- confirmation
- stronger confirmation only for truly high-risk operations

Do not add confirmation dialogs to harmless actions.
Avoid vague messages like "آیا مطمئن هستید؟" when specific context is available.

4. Context safety

Admin users must clearly understand:
- current role
- current organization
- current student/context where applicable

Improve existing indicators when ambiguity exists.
Do not redesign the role system.
Do not rely only on color.
Use text, icon where useful, and the current accent color as secondary reinforcement.

5. Forms

Across existing features improve consistency for:
- labels
- required fields
- helper text
- validation errors
- pending state
- save/cancel behavior
- dirty-state protection only where data loss is realistic
- sensible autofocus
- preserving user input after recoverable errors

6. Tables/lists

Use the improved AdminDataTable or existing list patterns consistently.
Improve:
- search
- filter reset
- loading
- empty state
- clear sorting state
- row actions
- selection/bulk-action safety
- responsive behavior

Do not add data-grid complexity without a real feature need.

7. Detail workflows

Where a page already has modal/drawer/detail-panel behavior:
- improve consistency
- keep context visible
- make close/back behavior predictable
- ensure keyboard operation

Do not introduce drawers everywhere simply as a trend.

8. Notifications and feedback

Improve current notification center/toast usage:
- reduce duplicate/noisy messages
- distinguish informational from actionable items
- make important failures visible near the failed action
- use toast as secondary confirmation rather than sole state feedback

9. Command palette

The Admin already has AdminCommandPalette.
Do not redesign it.
Improve when needed:
- shortcut discoverability
- accessible labels
- empty state
- search quality
- navigation commands
- safe handling of mutating commands
- role/permission-aware entries

Do not expose destructive actions as one-keystroke commands.

10. Mobile/RTL

Audit high-value workflows on:
- desktop
- tablet
- narrow mobile

Fix:
- horizontal overflow
- off-screen actions
- broken sticky/fixed elements
- cramped forms
- table/list fallback behavior
- RTL direction mistakes
- mixed Persian/English alignment issues

11. Dark/light mode

Fix obvious mismatches:
- unreadable muted text
- wrong surfaces
- invisible borders
- low-contrast focus rings
- ambiguous statuses
- hardcoded colors that fight current theme variables

Do not create a new theme.

12. Performance perception

Using the existing architecture:
- preserve previous data where appropriate
- use stable loading skeletons
- avoid full-page loading for small refetches
- indicate background refresh subtly
- avoid unnecessary animation
- respect prefers-reduced-motion

13. Accessibility

Verify:
- tab order
- visible focus
- landmark structure
- heading order
- semantic buttons vs clickable divs
- form labels
- dialog semantics
- status announcements where needed
- practical touch targets
- color contrast

14. Feature-by-feature migration

Do not change all features in one giant rewrite.

Process roughly in this order unless source evidence supports another order:
1. shell/shared patterns
2. students
3. reports
4. planner
5. exams
6. notifications
7. chat
8. remaining management features

For each feature:
- identify current UX problems
- apply shared components/patterns
- remove duplicate local UI behavior
- preserve business logic
- keep the visual design recognizable

Do not migrate a feature merely for code style.

Testing:
Run:
- typecheck
- lint
- unit tests
- test:a11y
- relevant Playwright/e2e tests

For important workflows add/update tests for:
- save/update feedback
- destructive confirmation
- loading/error/empty states
- keyboard navigation
- context/role visibility
- mobile overflow where practical

Deliverables:

1. Existing pages with improved UI/UX consistency.
2. No full redesign.
3. No backend changes.
4. No route/API contract changes.
5. No unnecessary dependency migration.
6. Create:
   apps/admin/docs/ui-ux/MIGRATION-3-PATTERNS.md
7. Create final readiness document:
   apps/admin/docs/ui-ux/PRE-REDESIGN-STATUS.md

PRE-REDESIGN-STATUS.md must contain:
- what was improved
- what is now standardized
- what UX debt remains
- what should NOT be touched before redesign
- components ready to keep during redesign
- components likely to be replaced during redesign
- high-value redesign opportunities
- technical risks for the future redesign

End after Migration 3.
Do NOT start the redesign.
```

---

## Expected result after Migration 3

The application should still clearly look like the current Moshaver Admin, but it should feel:

```text
more consistent
more predictable
more accessible
safer
less frustrating
better in RTL
better in dark mode
better on smaller screens
easier to maintain
easier to redesign later
```

The architectural outcome should be:

```text
features
   ↓
stable Moshaver shared UI
   ↓
well-defined interaction behavior
```

instead of:

```text
features
   ↓
duplicated Tailwind
   ↓
inconsistent interactions
```

Only after these three migrations should the separate full UI/UX redesign phase begin.
