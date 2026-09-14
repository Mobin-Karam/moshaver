# Migration 1 — Admin UI/UX audit

Date: 2026-09-14. Scope: current `apps/admin` source, Graphify navigation verified against shared UI, shell, feature, theme and accessibility code.

## Critical UX issues

- **FIXED NOW:** staff exam and question workflows incorrectly required a student even though canonical `/exams` is organization-scoped. Student context is now optional and explained.
- **FIXED NOW:** assignment removal could target an exam outside the active exam scope and could remove a started assignment. Both are enforced by the API; the UI explains the restriction.
- **KEEP AS-IS:** database restore uses its existing high-friction confirmation and backend restrictions.

## Accessibility issues

- **FIXED NOW:** loading states announce busy status; modal close controls have accessible names; dialogs associate descriptions; shared controls expose invalid/description relationships; global focus-visible treatment is consistent.
- **FIXED NOW:** `Field` labels now target an input's explicit ID instead of a different generated ID. Regression tests cover generated and caller-provided IDs plus help/error associations.
- **FIXED NOW:** DatePicker previous/next month controls have Persian accessible names. Optional dates can be cleared with Delete/Backspace; required dates no longer expose a misleading clear affordance.
- **KEEP AS-IS:** the existing modal focus trap, Escape behavior, focus return, semantic table caption and selection announcements are sound.
- **DEFER TO REDESIGN:** a full manual screen-reader pass and browser keyboard matrix across every feature.

## Consistency issues

- **FIXED NOW:** shared fields now support required, help and error contracts. Empty states support a separate description. Education uses shared management patterns.
- **KEEP AS-IS:** existing component heights, rounded geometry, role accents and page information architecture.
- **DEFER TO REDESIGN:** visual consolidation of every legacy feature-specific card and toolbar.

## RTL and dark-mode issues

- **FIXED NOW:** gooey notifications are globally RTL; modal borders, header/footer and close hover are dark-mode aware; mixed numeric counts use Persian formatting where newly introduced.
- **FIXED NOW:** StudentPicker and the command palette no longer retain light-only triggers, filters, recent items, keyboard hints, borders and hover surfaces in dark mode.
- **KEEP AS-IS:** Persian calendar presentation with ISO transport and the existing theme tokens.
- **DEFER TO REDESIGN:** visual review of all rare modal combinations in every role accent.

## Maintainability issues

- **FIXED NOW:** all existing notification callers continue through one Moshaver-owned adapter; no feature imports the vendor directly. Education metrics are pure and tested.
- **KEEP AS-IS:** shared UI remains inside Admin until a proven second application consumer exists.
- **DEFER TO REDESIGN:** splitting the large legacy `ui.tsx` solely for file size.

## Source evidence reviewed

- Shared primitives: `shared/ui/ui.tsx`, `modal.tsx`, `popover.tsx`, `StudentPicker.tsx`, `date-picker.tsx`, `admin-data-table.tsx`, `notifications.tsx`.
- Shell and context: `app/layout/AdminLayout.tsx`, header, sidebars, mobile navigation, command palette and `shared/ui/work-context-bar.tsx`.
- Representative workflows: students, planner, reports, exams, questions, notifications, chat, access, system and reusable forms.
- Automated surfaces: `src/a11y`, shared UI tests, route authorization tests and role/navigation tests.

## Deferred redesign opportunities

Exam creation can eventually become a fully transactional six-step workflow when question selection and assignment drafts have a backend draft contract. Dense desktop tables may later gain purpose-built mobile representations. Neither is faked in this migration.
