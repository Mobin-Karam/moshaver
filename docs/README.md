# Moshaver documentation

This directory is the navigation hub for the Moshaver monorepo. Documentation is grouped by intent so a person or an agent can distinguish current architecture from migration plans and historical evidence.

Last repository inspection: 2026-09-02.

## Read first

1. [System map](./architecture/system-map.md) — applications, APIs, data stores, runtime relationships, and version boundaries.
2. [Repository runbook](./operations/repository-runbook.md) — local commands, validation, deployment entry points, and known script caveats.
3. Choose the relevant version:
   - [v1.4 runtime architecture](./architecture/backend-v1-4-runtime.md)
   - [backend v2 design](./architecture/backend-v2-design.md)
   - [student v2/Tauri runtime](./architecture/student-v2-tauri-runtime.md)

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
- [v1.4 runtime architecture](./architecture/backend-v1-4-runtime.md)
- [Backend v2 design](./architecture/backend-v2-design.md)
- [Student core boundary](./architecture/student-core-boundary.md)
- [Student v2 and Tauri runtime](./architecture/student-v2-tauri-runtime.md)

## Components and APIs

- [Backend v1.4 service](./components/backend-v1-4-service.md)
- [Backend v2 service](./components/backend-v2-service.md)
- [Backend v2 HTTP API](./components/backend-v2-http-api.md)
- [Admin v2 application](./components/admin-v2-application.md)

The v1.4 static Admin and Student applications are described with their backend in the [v1.4 runtime architecture](./architecture/backend-v1-4-runtime.md).

## Operations

- [Repository runbook](./operations/repository-runbook.md)
- [v1.4 security model](./operations/security-v1-4.md)
- [v1.4 Runflare deployment](./operations/runflare-v1-4-deployment.md)
- [v1.4 chat and realtime SSE](./operations/chat-realtime-sse-v1-4.md)
- [Plan import schema version 2](./operations/plan-import-schema-v2.md)

## Migration work

- [Backend v1-to-v2 strategy](./migrations/backend-v1-to-v2-strategy.md)
- [Backend v2 discovery](./migrations/backend-v2-discovery.md)
- [Admin v2 API gap plan](./migrations/admin-v2-api-gap-plan.md)
- [Admin v2 API compatibility](./migrations/admin-v2-api-compatibility.md)
- [Admin v2 migration guide](./migrations/admin-v2-migration-guide.md)
- [Student v1 feature inventory](./migrations/student-v1-feature-inventory.md)
- [Student v1-to-v2 audit](./migrations/student-v1-to-v2-audit.md)
- [Student v2 parity gaps](./migrations/student-v2-parity-gaps.md)
- [Student v2 delivery plan](./migrations/student-v2-delivery-plan.md)

## Product and releases

- [Interface design principles](./product/interface-design-principles.md)
- [Version roadmap](./product/version-roadmap.md)
- [Application icon catalog](./product/application-icon-catalog.md)
- [Product changelog](./releases/product-changelog.md)
- [v1.4.0 — Admin and exams](./releases/v1-4-0-admin-exams.md)
- [v1.4.1 — Inline exams](./releases/v1-4-1-inline-exams.md)
- [v1.4.2 — Daily motivation](./releases/v1-4-2-daily-motivation.md)

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
