# Moshaver Admin App Architecture

## Goal

Keep the admin application small, dependency-light, RTL-first, and deployable as static files while gradually removing responsibilities from the legacy `js/admin.js` module.

## Current module layout

```text
admin-app/
├── css/
│   └── admin.css
├── js/
│   ├── admin.js                  # domain screens and orchestration (legacy extraction target)
│   ├── api.js                    # admin API client configuration
│   ├── api-client.shared.js      # cookie/CSRF/XHR/SSE client
│   ├── ui-utils.shared.js        # DOM escaping/icons/toasts
│   ├── update.js                 # PWA update lifecycle
│   ├── core/
│   │   ├── state.js              # admin state defaults and session reset
│   │   └── connectivity.js       # API/network status presentation
│   ├── components/
│   │   ├── modal.js              # modal open/close/focus/keyboard behavior
│   │   └── forms.js              # busy buttons and textarea auto-grow
│   └── utils/
│       └── dates.js              # date ranges and Persian-number formatting
├── scripts/
│   └── validate-static.js        # dependency-free static integrity check
└── check-admin.sh                # JavaScript syntax + static integrity validation
```

## Refactoring rule

Do not split `admin.js` by copying shared mutable state into multiple independent files. Extract one coherent responsibility at a time and keep behavior/API contracts stable.

Recommended next domains to extract, in order:

1. Authentication/session lifecycle into `core/auth.js`.
2. Navigation/view activation into `core/router.js`.
3. Chat polling/SSE rendering into `views/chat.js`.
4. Planner rendering/forms into `views/planner.js`.
5. Exams/quizzes into `views/exams.js` and `views/quizzes.js`.
6. Imports into `views/imports.js`.
7. Dashboard and live activity screens.

Reports, student profile editing, subject management, and system/security screens have already been extracted into `views/`.

Each extraction should preserve existing endpoint paths, request bodies, response handling, CSRF behavior, and authorization assumptions.

## Performance rules

- Do not add a frontend framework just to modularize the application.
- Keep startup scripts small and cacheable.
- Prefer native DOM APIs and event listeners.
- Avoid large animation or visualization libraries.
- Paginate/incrementally render large operational lists when backend support exists.
- Use `prefers-reduced-motion` and 44px mobile touch targets for critical controls.

## Accessibility rules

- Keep keyboard-visible focus states.
- Modal dialogs must trap focus, close with Escape, and restore the previous focus target.
- Preserve semantic labels and RTL ordering.
- Keep status messages exposed through live regions where appropriate.

## Validation

Run:

```bash
./check-admin.sh
```

This validates JavaScript syntax, local asset references, service-worker shell references, required extracted modules, and key accessibility hooks.

Full behavior validation still requires the Moshaver backend because this archive contains only the admin frontend.
