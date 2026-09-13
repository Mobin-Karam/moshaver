# Phase 3 — CMB platform W3

## Status

W3 is implemented as a mechanism/policy split. Product identity eligibility, student/resource access, recipient resolution, persistence, and transport behavior remain in `apps/api`.

## Extracted packages

- `@moshaver/cmb-auth` owns login normalization, opaque session credential issuance, SHA-256 token hashing, constant-time CSRF comparison, and token expiry calculation.
- `@moshaver/cmb-authorization` owns capability projection and organization/work-context evaluation over persistence-neutral inputs.
- `@moshaver/cmb-notifications` owns page-limit normalization, opaque cursor encoding/validation, and public notification projection.

## Product adapters retained

- `AuthService` retains bcrypt password verification, user/student eligibility, login throttling, TypeORM session persistence, and localized API errors.
- `AuthorizationService` retains role/membership loading and all student ownership, organization-admin, and relationship queries.
- `NotificationsService` retains user/student recipient lookup, TypeORM queries, realtime emission, Web Push delivery, and localized cursor errors.

This split prevents `Student`, `UserRelationship`, TypeORM, NestJS, and Moshaver role/resource policy from entering reusable CMB packages while preserving `/api/v2` behavior.
