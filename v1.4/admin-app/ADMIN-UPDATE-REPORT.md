# Admin App v1.4.3 Update Report

## Summary

The admin PWA was modernized incrementally without changing its vanilla JavaScript/static deployment architecture or backend contracts.

Main changes:

- Added explicit `core/`, `components/`, `utils/`, and populated `views/` modules.
- Extracted admin state defaults/reset logic from `admin.js`.
- Extracted date/Persian-number helpers.
- Extracted modal focus, Escape-key, focus-trap, and focus-restoration behavior.
- Extracted form busy-state and textarea auto-grow helpers.
- Added network/API status presentation for online/offline/syncing states.
- Extracted Reports, Student Profile, Subjects, and System/Security screens from `admin.js`.
- Improved mobile navigation state and closes the sidebar after navigation.
- Added keyboard support to the JSON file drop zone.
- Added skip-link, dialog semantics, visible keyboard focus, 44px mobile targets, and reduced-motion behavior.
- Updated service-worker precache entries for all new modules.
- Added dependency-free admin validation scripts.
- Added architecture/refactoring documentation.

## Files changed

Existing files updated:

- `config.js`
- `css/admin.css`
- `docker-entrypoint.sh`
- `index.html`
- `js/admin.js`
- `js/views/README.md`
- `local-server.js`
- `sw.js`
- `sw.template.js`
- `version.json`

New files:

- `ADMIN-ARCHITECTURE.md`
- `ADMIN-UPDATE-REPORT.md`
- `check-admin.sh`
- `scripts/validate-static.js`
- `js/core/state.js`
- `js/core/connectivity.js`
- `js/components/forms.js`
- `js/components/modal.js`
- `js/utils/dates.js`
- `js/views/reports.js`
- `js/views/students.js`
- `js/views/subjects.js`
- `js/views/system.js`

## Database changes

None.

## API contract changes

None.

Existing endpoint paths, request bodies, response handling, cookie authentication, CSRF handling, and SSE client behavior were preserved.

## Security impact

- Authentication/session/CSRF behavior was not weakened or replaced.
- Modal keyboard handling and focus restoration were improved.
- Existing nginx security headers/CSP remain in place.
- No tokens or authentication secrets were moved into local storage.
- Existing escaping helpers are still used by extracted view rendering.

## Validation

Executed successfully:

```text
./check-admin.sh — passed
node --check for every JavaScript file — passed
scripts/validate-static.js — passed
HTML duplicate-ID/reference checks — passed
service-worker shell asset checks — passed
core module smoke checks — passed
local-server static HTTP checks — passed (index, extracted modules, CSS, service worker)
```

The local static server returned HTTP 200 for the admin shell and representative extracted assets.

## Manual validation

No real browser workflow validation against a running Moshaver backend was performed because this archive contains only the admin frontend. Login, API-driven screens, SSE events, and mutation flows therefore still require end-to-end browser validation with the backend available.

## Remaining risks / next work

`js/admin.js` is smaller and less cross-cutting, but it still owns the most coupled domains. The next safe extraction order is:

1. authentication/session lifecycle
2. navigation/view routing
3. chat/SSE/polling
4. planner
5. exams/quizzes
6. JSON imports
7. dashboard/live activity

Do not extract those in one large rewrite. Move one domain at a time and browser-test each flow against the real backend before continuing.
