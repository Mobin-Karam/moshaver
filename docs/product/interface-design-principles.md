# Moshaver UI/UX Direction

## Student principle

The Student application should answer one question first: **الان باید چه کاری انجام بدهم؟**

The current-task card, next task, today's completion, exam countdown and due reviews take priority over generic charts. Focus Mode removes navigation clutter during a study session. Task states use meaningful semantics (`done`, `current`, `upcoming`, `needs decision`) instead of painting every unfinished item red.

Mobile navigation is limited to five destinations: Today, Plan, Exams, Advisor, More. Progress/mistakes remain reachable from More.

The UI is deliberately framework-free and uses local custom SVG assets to minimize download, parse and runtime cost on lower-end Android devices.

## Admin principle

The Advisor dashboard is exception/action oriented: missed work, task issues, recovery requests, due reviews and unread student chat are surfaced before decorative analytics.

The planner supports day/week/month inspection, draft/publish, copy/duplicate, workload/conflict warnings and JSON import. Chat is a desktop split-pane interface with all student conversations in one list.

## Interaction rules

- Large, finger-friendly primary actions on Student.
- Short completion forms; objective metrics are automatic.
- No interruptive PWA update while a study timer or quiz is active.
- Offline state and sync state are visible without exposing technical jargon.
- Motion is subtle and respects reduced-motion settings.
- No external icon library, font CDN, blur-heavy visual effects or unnecessary animation framework.
