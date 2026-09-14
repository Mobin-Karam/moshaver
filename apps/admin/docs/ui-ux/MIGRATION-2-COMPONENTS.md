# Migration 2 — Shared component hardening

Date: 2026-09-14.

## Components improved

- `Button`: existing loading lock and `aria-busy` retained; reduced-motion behavior added; reusable `sm`, `md` and `icon` sizes normalize touch targets without removing class overrides.
- `Input`, `Textarea`, `Select`: normalized invalid, disabled and read-only visual states using existing tokens.
- `Field`: additive `description`, `required` and `id` API; deterministic React IDs and automatic label/help/error relationships. Native and Moshaver form controls are associated explicitly; arbitrary composite children are no longer mislabeled as native inputs.
- `EmptyState`, `LoadingState` and `ErrorState`: consistent descriptive contracts, live busy semantics and announced contextual failures.
- `Modal`: described-by association, named close control, visible focus, dark surfaces, focus trap/Escape/focus return and inline async-confirmation failures.
- `ViewportPopover`: Escape closes and restores focus to the trigger.
- `AdminDataTable`: semantic `aria-sort`, keyboard-activatable rows, contextual shared error output, caption, selection semantics and responsive overflow.
- `StudentPicker`: dark-mode surfaces and Arrow/Home/End keyboard traversal while retaining Persian search and bounded cohort rendering.
- `DatePicker`: invalid-value safety, constrained Today action, named month navigation, required-date safety, keyboard clear for optional dates and Moshaver-owned time input styling.
- Notifications: Sonner-facing adapter replaced with a Moshaver-owned `goey-toast` adapter while preserving the application API; repeated typed feedback is deduplicated by stable active-toast IDs.

## API changes and examples

All changes are additive. A field may now express its complete accessible contract:

```tsx
<Field label="عنوان" required description="برای دانش‌آموز نمایش داده می‌شود" error={error}>
  <Input value={title} onChange={onChange} />
</Field>
```

Buttons can opt into a shared compact or icon touch target:

```tsx
<Button size="sm">ذخیره</Button>
<Button size="icon" aria-label="حذف"><Trash2 aria-hidden="true" /></Button>
```

Data tables can provide a contextual failure while retaining their existing API:

```tsx
<AdminDataTable
  error
  errorDescription="اتصال شبکه را بررسی کنید."
  onRetry={refetch}
  {...tableProps}
/>
```

Existing `notify(...)` and `notifications.success/error/loading/update/dismiss/undoCountdown` callers remain valid. New code may use `notifications.promise(...)`; vendor imports remain prohibited in feature code.

## Deprecated patterns

- Feature-local toast providers or direct `sonner`/`goey-toast` imports.
- Error text detached from its control.
- Unnamed icon-only dialog controls.
- Click-only data-table rows and ad-hoc feature error placeholders where `ErrorState` fits.

## Remaining debt

Some older feature forms have not yet supplied `description` or inline errors to the enhanced Field API. Existing hook dependency warnings are tracked separately because changing async feature behavior is not a safe mechanical UI migration.

## Intentionally deferred

No `packages/ui`, new theme system, visual redesign, new table framework or wholesale primitive split was introduced.
