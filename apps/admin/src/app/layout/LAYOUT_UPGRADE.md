# Admin layout – UI/UX stabilization pass

This folder contains the second-pass admin shell. It keeps the existing routes and backend contracts, but removes regressions introduced by the earlier layout upgrade.

## Fixed in this pass

- Removed the global Education student bar. Education pages already own a `StudentPicker`; the extra layout picker duplicated controls, duplicated loading work, changed page heights, and broke sticky-page geometry.
- Changed the global navigation shortcut from `Ctrl/⌘ + K` to `Ctrl/⌘ + Shift + P`. Planner and Chat already use `Ctrl/⌘ + K` for page-level actions.
- Global shortcuts no longer fire while the user is typing in an input, textarea, select, combobox, textbox, or contenteditable surface.
- Mobile drawer and command palette now trap keyboard focus, restore the previously focused control, and lock body scrolling while open.
- Command-palette keyboard selection automatically scrolls the active result into view.
- Collapsed sidebar tooltips were removed because they were rendered inside clipped scroll containers. Native `title` labels remain available without visual clipping.
- Contextual navigation is forced to its compact 4rem rail between `lg` and `xl`, preventing two fixed sidebars from consuming nearly half of a 1024–1279px viewport.
- Contextual rail expand/collapse is exposed at `xl`, where there is enough horizontal space for the expanded rail.
- Mobile bottom-navigation items now meet a more usable touch height and use larger labels.
- Clicking/tapping the already-active primary section keeps the user on the current contextual page instead of unexpectedly jumping to the first page in the section.
- Theme controls are no longer duplicated on desktop: the header owns the switcher at `xl+`; the account menu owns it below `xl`.
- Mobile header search is moved into the drawer on the smallest screens to protect title width.
- Account identity text is delayed until very wide screens so the header stays usable on laptops.
- Section landing breadcrumbs no longer render two adjacent crumbs pointing at the same URL.
- Planner receives a non-sticky global header because its own page toolbar already owns `sticky top-0`; this prevents the two sticky layers from occupying the same viewport position.
- Main content offsets now match the compact contextual rail at `lg` and the persisted rail state at `xl`.

## Global navigation shortcut

- `Ctrl + Shift + P` on Windows/Linux
- `⌘ + Shift + P` on macOS

Page-level shortcuts remain untouched.

## Responsive behavior

- `< lg`: mobile header, drawer, and bottom section navigation.
- `lg .. < xl`: primary desktop sidebar plus compact contextual icon rail.
- `xl+`: contextual rail can expand/collapse according to the persisted user preference.

## Files

- `AdminLayout.tsx` – shell state and global shortcut coordination.
- `AdminHeader.tsx` – responsive page identity and global controls.
- `AdminMainSidebar.tsx` – primary section navigation.
- `AdminContextSidebar.tsx` – contextual navigation with laptop-safe compact mode.
- `AdminMobileNavigation.tsx` – focus-safe mobile drawer and bottom navigation.
- `AdminCommandPalette.tsx` – global route search and recent navigation.
- `AdminAccountMenu.tsx` – account, theme (below xl), development backend tools, and logout.
- `admin-navigation.ts` – navigation metadata, aliases, destinations, and breadcrumbs.
- `layout-geometry.ts` – responsive content offset calculation.
- `layout-storage.ts` – persisted collapse state and recent-navigation storage.
