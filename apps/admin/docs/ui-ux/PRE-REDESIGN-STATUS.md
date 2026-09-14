# Admin pre-redesign status

Date: 2026-09-14.

## Improved and standardized

- Shared buttons, fields, inputs, loading/empty states, modal semantics, tables and notifications now expose consistent interaction and accessibility behavior.
- All feature feedback is routed through the Moshaver-owned notification adapter, backed by `goey-toast` v0.5.0 with RTL placement, typed states, bounded queues, progress, promise/update support, Escape close and touch swipe dismissal.
- Education has a capability-aware landing workspace. Exam and Question Bank workflows no longer depend on irrelevant student selection.
- Exam assignments have a scoped directory, searchable bulk add, guarded remove and real attempt/not-started counts.
- Existing role, organization and student context remains explicit and backend-authoritative.

## UX debt that remains

- Real-browser keyboard, screen-reader, narrow-phone and dark-mode checks are still needed across every role and uncommon modal combination.
- Some older forms have not adopted the enhanced Field description/error contract.
- Dense legacy tables may need purpose-built mobile presentation in the future.
- Exam authoring is not yet a transactional six-step wizard because questions and assignments do not share a backend draft transaction.
- Existing hook dependency lint warnings need feature-aware cleanup rather than mechanical dependency insertion.

## Do not touch before redesign

- Do not replace the shell, theme tokens, route tree, RTL direction, capability/context model or canonical API contracts as part of cleanup.
- Do not migrate Tailwind, introduce global state, create `packages/ui`, or wrap every surface in a generic Card without a proven need.
- Do not generate rank/taraz or other educational statistics that the backend cannot validate.

## Components ready to keep

`Button`, form controls and `Field`, `Card`, `Badge`, `EmptyState`, `LoadingState`, modal/confirmation infrastructure, `AdminDataTable`, `StudentPicker`, Persian `DatePicker`, management workspace patterns, the notification adapter and work-context controls have stable ownership and real consumers.

## Components likely to be revisited

Feature-specific dense card/list compositions, the large compatibility-oriented `ui.tsx` file organization and exam authoring composition may be replaced or split during a deliberate redesign. Their contracts and behavior should remain migration inputs.

## High-value redesign opportunities and risks

High-value opportunities are a transactional exam builder, deliberate mobile representations for dense management data and clearer cross-feature student context. Main risks are weakening tenant/capability boundaries, replacing proven Persian-calendar behavior, creating visual inconsistency across lazy feature routes, and mistaking frontend presentation state for canonical backend state.
