# Security v2 release audit

Date: 2026-09-06

## Release-blocking result

No open P0 or P1 authorization or data-isolation defect remains in the implemented v2 scope. This result is based on source review, 51 backend tests, a live cookie/CSRF security matrix against a disposable 32-migration SQLite database, 112 protected-route browser checks (7 staff roles by 16 routes), and a browser multi-role context-switch check.

## Boundaries proven

- Explicit role assignments, active memberships, capabilities, and active typed relationships are the authority; the legacy user discriminator grants no platform authority.
- Student, Guardian, Advisor, Teacher, Mentor, Content Manager, Organization Admin, and Platform Admin negative paths are exercised with separate identities across two organizations.
- Related staff see only their related student. Organization Admin sees only its organization. Content Manager has content scope without private student scope. Platform Admin is the only cross-organization administrative role.
- Teachers see only subjects explicitly assigned through the `(teacher, subject, organization)` assignment table.
- Exam delivery requires assignment and publication. Direct identifier enumeration of unrelated students, quizzes, conversations, and exams fails closed.
- Conversation reads and mutations require active membership; message edit/delete/reaction routes are conversation-scoped.
- Work-role and organization headers cannot select an unassigned context. Switching a multi-role account changes effective capabilities without re-login.
- DTO validation rejects privilege-field mass assignment. Authenticated mutations require CSRF. Disabled accounts and revoked sessions/relationships lose access immediately.
- Malformed JSON and oversized bodies return safe errors without stack or filesystem disclosure. Concurrent login failures are serialized for SQLite so throttle records cannot race their unique constraint.
- SSE is user-scoped and durable notifications are stored per recipient; administrators receive no implicit conversation visibility.

## Findings fixed in this audit

- Removed the legacy `ADMIN` fallback escalation.
- Added missing report/recovery persistence migrations.
- Removed runtime `/api/v2/admin/*` placeholder controllers and migrated clients to canonical routes.
- Corrected stale admin chat message mutation URLs to canonical conversation-scoped paths.
- Added explicit teacher-subject assignment persistence and filtering.
- Scoped Organization Admin relationship listing to its active organization context.
- Added durable chat notifications and static TypeORM imports.
- Added concurrent login-throttle, revocation, deactivation, invalid-ID, mass-assignment, malformed-body, oversized-body, cross-org, cross-chat, and unassigned-exam regressions.

## Residual operational risk

These are deployment checks, not unresolved application authorization defects:

- Configure alert thresholds and retention for authentication failures, authorization denials, and audit records in the target environment.
- Validate real Web Push delivery with production VAPID keys and browser permission. The subscription flow and service worker exist, but external delivery was not exercised.
- Repeat the disposable security matrix after production-like identity provisioning in staging before changing traffic.

## Reproducible verification

```bash
cd backend-v2
npm run lint
npm test -- --runInBand
npm run build
npm run test:e2e:security
npm run test:e2e:student

cd ../admin-v2
npm test -- --run
npm run build
npm run audit:parity
```

The E2E commands require a migrated disposable database, `ALLOW_E2E_SEED=true`, and the v2 server on the configured `E2E_API_URL`. Never seed a production database.
