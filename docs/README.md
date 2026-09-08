# Moshaver documentation

This directory is the navigation hub for the active Moshaver v2 monorepo. Documentation is grouped by intent so a person or an agent can distinguish current architecture from migration plans and historical evidence. The complete v1.4 tree is preserved on `archive/v1.4`.

Last repository inspection: 2026-09-08.

## Read first

1. [System map](./architecture/system-map.md) — applications, APIs, data stores, runtime relationships, and version boundaries.
2. [Repository runbook](./operations/repository-runbook.md) — local commands, validation, deployment entry points, and known script caveats.
3. Choose the relevant v2 runtime:
   - [backend v2 design](./architecture/backend-v2-design.md)
   - [student v2/Tauri runtime](./architecture/student-v2-tauri-runtime.md)
4. To change the project safely, read the [developer handbook](./operations/developer-handbook.md).

## Directory contract

```text
docs/
├── architecture/  Current system shape and stable technical boundaries
├── components/    One document per runnable app or public API
├── operations/    Run, validate, secure, recover, and deploy the system
├── migrations/    Compatibility gaps and staged v1-to-v2 work
├── product/       Product direction, UX principles, and shared assets
├── releases/      User-facing changelog, release notes, and screenshots
└── history/       Dated audits, old fixes, and evidence snapshots
```

Current behavior belongs in `architecture/`, `components/`, or `operations/`. Unfinished work belongs in `migrations/`. Time-bound evidence belongs in `history/`; do not treat it as current without checking the source.

## Architecture

- [System map](./architecture/system-map.md)
- [Backend v2 design](./architecture/backend-v2-design.md)
- [Student core boundary](./architecture/student-core-boundary.md)
- [Student v2 and Tauri runtime](./architecture/student-v2-tauri-runtime.md)

## Components and APIs

- [Backend v2 service](./components/backend-v2-service.md)
- [Backend v2 HTTP API](./components/backend-v2-http-api.md)
- [Admin v2 application](./components/admin-v2-application.md)
- [Admin v2 Communication workspace](./components/admin-v2-communication-workspace.md)
- [Admin v2 capability matrix](./ADMIN_V2_CAPABILITY_MATRIX.md) — current backend, frontend, permission, test, and status mapping.
- [Student and Family exam experience audit](./migrations/STUDENT_FAMILY_EXAM_AUDIT.md) — current learner/family baseline, integrity gaps, and phased delivery matrix.

## Operations

- [Repository runbook](./operations/repository-runbook.md)
- [Developer handbook](./operations/developer-handbook.md) — onboarding, conventions, and definition of done.
- [Feature and bug playbook](./operations/feature-and-bug-playbook.md) — secure vertical implementation and diagnosis.
- [Maintenance guide](./operations/maintenance-guide.md) — recurring care, incidents, dependencies, data, and rollback.
- [Documentation maintenance](./operations/documentation-maintenance.md) — ownership, update triggers, and review rules.
- [Plan import schema version 2](./operations/plan-import-schema-v2.md)
- [Admin v2 Web Push verification](./operations/admin-v2-web-push-verification.md)
- [Backend v2 product demo seed](./operations/backend-v2-product-demo-seed.md)

## Migration work

- [Backend v1-to-v2 strategy](./migrations/backend-v1-to-v2-strategy.md)
- [Backend v2 discovery](./migrations/backend-v2-discovery.md)
- [Admin v2 API gap plan](./migrations/admin-v2-api-gap-plan.md)
- [Admin v2 API compatibility](./migrations/admin-v2-api-compatibility.md)
- [Admin v2 migration guide](./migrations/admin-v2-migration-guide.md)
- [Historical API v1/v2 comparison](./API_V1_V2_AUDIT.md)
- [Student v1 feature inventory](./migrations/student-v1-feature-inventory.md)
- [Student v1-to-v2 audit](./migrations/student-v1-to-v2-audit.md)
- [Student v2 parity gaps](./migrations/student-v2-parity-gaps.md)
- [Student v2 delivery plan](./migrations/student-v2-delivery-plan.md)

## Product and releases

- [Interface design principles](./product/interface-design-principles.md)
- [Version roadmap](./product/version-roadmap.md)
- [Application icon catalog](./product/application-icon-catalog.md)
- [Product changelog](./releases/product-changelog.md)

## Historical evidence

- [v1.4 architecture audit — 2026-08-24](./history/audits/v1-4-architecture-audit-2026-08-24.md)
- [Repository inventory — 2026-08-24](./history/audits/repository-inventory-2026-08-24.md)
- [Initial v2 analysis](./history/audits/v2-initial-analysis.md)
- [Backend v2 test snapshot](./history/audits/backend-v2-test-report.md)
- [Admin v2 test snapshot](./history/audits/admin-v2-test-report.md)
- [Auth/sync fix v1.3.3](./history/fixes/auth-sync-v1-3-3.md)
- [Backend v1 changelog](./history/backend-v1-changelog.md)

## Maintenance rules

- Use descriptive kebab-case filenames that include the component and version when version-specific.
- Put verification dates inside snapshot documents and move stale snapshots to `history/`.
- Update this index and all inbound links when moving a document.
- Never duplicate an operations guide; keep one canonical document and link to it.
- Never place credentials, tokens, production database contents, or private `.env` values in documentation.
