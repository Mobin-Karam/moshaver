# Students module — UI/UX workspace upgrade

This package is a frontend-only redesign of the Students administration module. The existing `api/students.api.ts` file is intentionally unchanged.

## Workspace architecture

- Replaced the long list + always-editing surface with a primary/detail workspace.
- Desktop keeps the student directory and student detail visible together.
- Mobile/tablet use a directory-first flow; opening a student switches to a dedicated detail view with a back action.
- Selecting a student opens a read-first Overview instead of immediately exposing a large editable form.
- Added detail tabs: Overview, Activity, Profile, Workspace, and Security.
- Create mode is isolated from edit mode and retains unsaved-change protection.

## Directory improvements

- Compact status counts now double as filters, removing duplicated status controls.
- Search covers name, ID, username, grade, major, field and university target.
- Search filtering uses `useDeferredValue` so large client-side lists remain responsive.
- Desktop sorting is attached directly to sortable table headers.
- Mobile keeps a compact sort selector plus direction control.
- Active filters are summarized above the results with a single clear-filter action.
- Pagination remains client-side and still supports 25 / 50 / 100 rows.
- Search, filters, sort, page, page size, selected student and selected detail tab are reflected in URL query state.

## Student detail improvements

- Added a read-first overview with academic facts, last activity, profile completeness and missing-field chips.
- Profile editing is isolated into its own tab.
- Password reset and lifecycle operations are isolated into Security; password state no longer affects profile dirty-state.
- Archive is visually separated as a sensitive action.
- Existing quick links are condensed into a Workspace tab while preserving `studentId` in their URLs.
- Clipboard actions now include an `aria-live` confirmation.
- Profile-completeness bars use semantic `progressbar` ARIA attributes.

## Request behavior

No API was added or changed.

- `/overview` is requested only while the Overview tab is active.
- `/learning`, `/attempts`, `/progress/weekly`, and `/performance/topics` are requested only while Activity is active.
- Profile, Workspace and Security tabs do not trigger those insight queries.
- Existing React Query cache keys remain stable.

## Light / dark mode

The module retains the platform's `text-ink`, `text-brand`, `bg-brand` tokens and adds explicit dark variants to neutral surfaces, borders, state badges, skeletons and danger/success/warning messages.

This means the module no longer relies exclusively on light palette utilities such as `bg-white`, `bg-slate-50`, `text-slate-700`, `bg-amber-50`, or `bg-rose-50` without an explicit dark counterpart.

For a future global cleanup, these pairs can be replaced by fully semantic platform tokens such as `surface`, `surface-muted`, `border`, `muted-foreground`, `success`, `warning`, and `danger` without changing the component structure.
