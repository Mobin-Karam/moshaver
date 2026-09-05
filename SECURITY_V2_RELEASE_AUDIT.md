# Security v2 release audit

Date: 2026-09-05

## Release-blocking result

No open P0 or P1 authorization/data-isolation issue was found after the fixes below. This conclusion covers source review, unit-level role matrix checks, DTO validation, and live negative requests against a disposable seeded database. It is not a substitute for staging browser automation with production identity provisioning.

## Fixed during audit

- **P1 — legacy role escalation (fixed):** an account carrying the storage-era `ADMIN` discriminator could fall back to `PLATFORM_ADMIN` when explicit role assignments were absent. Authorization enrichment, the roles guard, account context, and dashboard context now give such an account no effective authority. A regression test covers both enrichment and guard behavior.
- **P1 — missing report persistence (fixed):** report and recovery entities had no matching fresh-database migration. The new migration creates both constrained tables, allowing server-authoritative reporting without runtime schema drift.
- **P2 — chat notification durability (fixed):** chat already emitted user-scoped SSE but did not create persistent per-recipient notifications. Message send now stores notification records and retains SSE as a signal.
- **P3 — runtime TypeORM loading (fixed):** chat used runtime `require` for `In`; it now uses the static import and safely handles an empty organization set.

## Identity and isolation evidence

`multi-role-isolation.spec.ts` models StudentA/StudentB and GuardianA/B, AdvisorA/B, TeacherA/B, MentorA, ContentManagerA, OrgAdminA, and PlatformAdmin. It verifies self/related access, denial of unrelated StudentB, content-only denial, organization isolation, explicit platform scope, the legacy-admin case, and rejection of privilege fields injected into an unrelated student DTO.

With a real `sara` STUDENT session on a fresh disposable database:

| Request | Result |
| --- | --- |
| `GET /api/v2/users` | 403 |
| `GET /api/v2/organizations` | 403 |
| `GET /api/v2/students/:self/reports` (staff route) | 403 |
| `GET /api/v2/system/database` | 403 |
| `POST /api/v2/chat/groups` | 403 |
| `GET /api/v2/relationships` | 200, intentionally limited to the authenticated user's relationship view |

Student-owned APIs derive the student profile from the authenticated user. Staff student APIs route through capability checks plus `AuthorizationService.canAccessStudent`; organization operations require capability plus active membership except explicit Platform Admin scope. Conversation content requires active membership and administrators have no implicit chat visibility.

## Open findings

### P2 Medium

- A full HTTP/browser matrix with separately provisioned accounts for all roles and both organizations is not automated. The service-level matrix and live STUDENT denial checks pass, but staging should automate cookie/CSRF flows for every listed API area before public cutover.
- Teacher subject-specific restrictions rely on explicit relationship creation and the calling service's subject query. Add a dedicated subject-assignment entity if teachers must be constrained below whole-student scope in a future policy revision.

### P3 Low

- Compatibility `/admin/*` aliases remain Platform-Admin-only. They should be removed after client telemetry proves no use; they do not broaden other roles.
- Rate-limit and authorization audit alerting needs deployment-level thresholds and retention configuration.

## Verification commands

- `cd backend-v2 && npm run lint`
- `cd backend-v2 && npm test -- --runInBand`
- `cd backend-v2 && npm run build`
- Fresh SQLite migration plus `PRAGMA foreign_key_check`
- Disposable-server cookie/CSRF requests listed above

