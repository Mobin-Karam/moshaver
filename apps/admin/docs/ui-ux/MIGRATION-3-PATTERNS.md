# Migration 3 — Admin feature consistency

Date: 2026-09-14.

## Applied patterns

- The Education section now has a capability-filtered overview and predictable landing destination rather than redirecting to a student-specific learning screen.
- Exams and Question Bank load organization-scoped data immediately. Student selection is optional context, eliminating a blocked empty screen and an unnecessary request dependency.
- Exam cards keep actions beside the affected exam and show assignment, attempt and not-started counts without inventing analytics.
- Assignment management has scoped loading/error/empty states, searchable bulk number selection, pending locks, contextual feedback and server-enforced destructive safety.
- Role quick actions and navigation expose Education only when the active capability set allows it.
- Gooey notifications provide consistent RTL feedback, promise/loading transitions, progress, keyboard dismissal and bounded queuing. Important restrictions also remain visible inline or in modal descriptions.

## Context, responsive and theme behavior

The existing work-context bar remains authoritative for active role and organization. No capability is inferred from color or navigation. New layouts use wrapping actions, responsive grids, bounded scrolling and existing surface tokens. Reduced-motion preferences disable page/button motion where supported.

## Verification boundary

Automated type, unit, accessibility and production build gates cover shared behavior. A real-browser pass is still required for animation appearance, narrow-device assignment interaction, focus behavior with the morphing toast, and every role/context transition. No backend API contract outside the canonical `/api/v2` surface was introduced.

## Deferred to full redesign

The shell, information architecture, theme and feature page structures remain unchanged. A future redesign may revisit dense table mobile views and exam authoring composition, but must not treat these migration notes as authorization for a rewrite.
