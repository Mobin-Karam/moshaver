<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Runbook](./REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student Core](./student-core-architecture.md) | [Tauri](./tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Student Core Architecture

Date: 2026-08-20

## Purpose

`student-core/` is the migration boundary between the current static student app and future platform shells. It contains business logic that can run in web, Tauri desktop, and Tauri mobile without depending on DOM, React, service workers, browser storage, or native APIs.

The current `student-app/` remains untouched and is still the v1 reference implementation.

## Package Layout

- `auth/`: student-session restoration and student-role validation.
- `planner/`: planned minutes, task status, current/next task selection, plan metrics.
- `tasks/`: task completion payload logic.
- `exams/`: quiz attempt answer shaping, unanswered count, remaining time calculation.
- `questions/`: option normalization helpers.
- `reviews/`: review interval helpers.
- `chat/`: message append and unread-count helpers.
- `notifications/`: unread-count and immutable read-state helpers.
- `sync/`: sync queue item creation, push orchestration, conflict policy helpers.
- `storage/`: platform-neutral storage helpers plus in-memory test provider.
- `providers/`: interfaces implemented by browser, Tauri, and test adapters.

## Provider Interfaces

The core depends on interfaces only:

- `AuthProvider`
- `StorageProvider`
- `NotificationProvider`
- `SyncProvider`
- `NetworkProvider`
- `RealtimeProvider`
- `ClockProvider`

Browser and Tauri implementations must live outside core. Business modules should never import:

- `window`
- `document`
- `navigator`
- `localStorage`
- `sessionStorage`
- `EventSource`
- service worker APIs
- React components or hooks
- Tauri APIs

## Current v1 Logic Covered

The first extraction pass captures pure behavior from `student-app/js/app.js`:

- planner time math and status decisions
- active-session current task fallback
- task completion payload construction
- exam/quiz countdown bounded by exam close time
- quiz attempt payload generation
- offline sync conflict policy
- notification unread/read helpers
- chat message list helpers

## Adapter Strategy

Web adapter:

- wraps the current `/api/v1` HTTP contract
- may keep cookie and CSRF behavior from `student-app/js/api.js`
- may use `localStorage`, `sessionStorage`, service worker, and `EventSource`

Tauri adapter:

- uses native HTTP or webview fetch depending on final security model
- stores durable local data in SQLite
- implements realtime with SSE-compatible transport or polling fallback
- exposes the same provider interfaces to the UI

## Migration Rule

Only logic that has been characterized in tests should be moved out of v1 behavior. UI migration should call `student-core` rather than reimplementing planner, exam, chat, notification, auth, storage, or sync decisions inside components.

