<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver | مشاور v1.3.3 — Authentication & Synchronization Fix

## Bugs reproduced from the supplied recordings

### Student
The login succeeded, but a later Student mutation such as starting a study session returned HTTP 403. The backend rotated the CSRF token every time `/auth/me` was requested. Multiple startup/visibility checks could therefore invalidate the token held by the Student UI.

### Admin
The Admin login form visually rendered, but clicking Login produced no API request. `admin.js` defined `init()` but did not invoke it, so the submit handler was never bound.

## v1.3.3 behavior

- CSRF is stable for the lifetime of a session.
- Existing v1.3.2 sessions are migrated lazily and safely.
- A 403/CSRF mutation performs one `/auth/me` refresh and retries once.
- Login ignores stale startup-auth callbacks.
- Logout cancels in-flight app requests, invalidates the server session, clears local CSRF state, and keeps an offline pending-logout marker until the server confirms logout.
- Wrong-role sessions are cleared server-side.
- Tabs on the same app origin synchronize login/logout using a non-secret localStorage signal.
- Admin initialization runs on DOM ready.

## Expected regression sequence

Student: `POST /auth/login -> 200`, repeated `GET /auth/me -> 200`, `POST /study-sessions/start -> 201`, `POST /auth/logout -> 200`, then `/auth/me -> 401`.

Admin: submit Login -> a real `POST /auth/login`, then `/auth/me -> 200`; Logout -> `200`, then `/auth/me -> 401`.
