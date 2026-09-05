# Planner audit

## Bugs fixed/recommended

- Date handling needs validation before plannerRange.
- PlannerPage is too large and should be split.
- PlannerCanvas contains day/week/month/list rendering and should be separated.
- PlannerForms contains multiple unrelated forms.
- Menus should use shared popover/dropdown primitives.
- Buttons need type="button" to avoid accidental form submission.
- API query strings should use URLSearchParams.
- Heavy calculations should use memoization.
- Selection state should support bulk actions with safer ids.
- Drag/drop handlers need validation.

## Suggested structure

components/
  canvas/
  forms/
  menus/
  analytics/
  shared/

hooks/
  usePlannerFilters
  usePlannerNavigation
  usePlannerActions

lib/
  date/
  validation/
  planner-model
