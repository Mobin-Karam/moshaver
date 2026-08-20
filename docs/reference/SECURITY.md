<!-- DOCS_NAV_START -->
[Docs Home](../README.md) | [Runbook](../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../student-app-v2-gap-analysis.md) | [Student Core](../student-core-architecture.md) | [Tauri](../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver v1.3 Security Model

## Authentication

- Session identifiers are random 32-byte values.
- Only a SHA-256 digest of the session identifier is stored in SQLite.
- The raw session is sent in an HttpOnly cookie.
- Production cookies are Secure.
- Production uses `SameSite=Strict`. The Student/API are same-site under `mahakaram.ir`; the local Admin uses the bundled same-origin reverse proxy, so it does not require third-party cookies.
- Bearer-token fallback is disabled in production by default.

## CSRF

Every cookie-authenticated mutating protected request (`POST`, `PUT`, `PATCH`, `DELETE`) must send the per-session `X-CSRF-Token`. The token is held only in `sessionStorage` by the frontend and is rotated on `/auth/me`.

CORS uses an exact allow-list and `Access-Control-Allow-Credentials: true`.

## Passwords

New passwords use scrypt with a versioned format and explicit work factors. Legacy v1.2 hashes remain verifiable and are rehashed after a successful login. Login hashing is asynchronous so password verification does not block the Node.js event loop.

Production refuses to start if required admin/student passwords or CORS origins are missing.

## Brute force

Failed logins are persisted in SQLite and limited by both source IP and IP+username. Repeated attempts return HTTP 429 for the configured lock interval.

## Frontend XSS defenses

- Authentication session cookies are HttpOnly and inaccessible to JavaScript.
- Text from update notes uses `textContent` rather than raw `innerHTML`.
- Student/Admin Nginx deployments include CSP, `nosniff`, frame blocking, restrictive permissions policy and no-referrer policy.
- Dynamic text rendered into HTML is escaped through the app helper.

## Data integrity

Objective study/test metrics are calculated by the backend from completed study sessions and quiz attempts. Nightly reports accept subjective values such as focus/fatigue/motivation, but do not trust client-submitted study hours or test totals.

Quiz duration is based on a server-created `quiz_run`, not a client-provided duration.

## Chat

- Sender identity and role always come from the authenticated session.
- Conversation access is checked server-side.
- Message length is limited.
- Chat sending is rate limited.
- SSE is only a realtime delivery layer; chat history in the database remains the source of truth.

## Offline data

Student offline mutations are scoped to `moshaver_queue:<userId>` so one account cannot flush another account's queued study data after an account switch.

## Current boundary

v1.3 is designed for one primary advisor account and students managed by that advisor. It is not yet a multi-organization SaaS isolation model. Before adding independent advisors/organizations, add explicit `organization_id`, advisor-student memberships and authorization tests for every student-scoped admin route.

## Recommended production operations

- Use HTTPS only.
- Keep SQLite under a persistent `/data` disk and back it up.
- Do not expose the SQLite file through a static/file server.
- Use long random production passwords; rotate the admin password through the application rather than assuming changing the seed ENV rewrites an existing DB user.
- Keep one backend instance while using a local SQLite file.
- Review audit logs and failed-login behavior before public launch.
