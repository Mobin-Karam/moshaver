<!-- DOCS_NAV_START -->
[Docs Home](./README.md) | [Runbook](./REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](./student-app-v2-gap-analysis.md) | [Student v2 Plan](./student-app-v2-implementation-plan.md) | [Student Core](./student-core-architecture.md) | [Tauri](./tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver Documentation Dashboard

Last updated: 2026-08-20

Welcome to the Moshaver documentation hub. This folder is the single place to browse project, migration, release, deployment, and module documentation.

## Start Here

1. [Repo Audit and Runbook](./REPO_AUDIT_AND_RUNBOOK.md)
2. [Student App v2 Gap Analysis](./student-app-v2-gap-analysis.md)
3. [Student App v2 Implementation Plan](./student-app-v2-implementation-plan.md)
4. [Student App v1 Backup Analysis](./student-app-v1-backup-analysis.md)
5. [Student Core Architecture](./student-core-architecture.md)
6. [Tauri Student App Architecture](./tauri-architecture.md)

## Current Reality

The active production-capable stack is still the v1 app stack:

- `backend/`
- `student-app/`
- `admin-app/`

The migration stack exists and builds, but is not yet feature-parity:

- `student-core/`
- `student-app-v2/`
- `backend-v2/`
- `admin-v2/`

Read [Student App v2 Gap Analysis](./student-app-v2-gap-analysis.md) before replacing any legacy student flow.

## Migration Series

- [Migration v1 to v2](./migration-v1-to-v2.md)
- [Backend v2 Discovery](./backend-v2-discovery.md)
- [Student App v1 Backup Analysis](./student-app-v1-backup-analysis.md)
- [Student Core Architecture](./student-core-architecture.md)
- [Tauri Student App Architecture](./tauri-architecture.md)
- [Student App v2 Gap Analysis](./student-app-v2-gap-analysis.md)
- [Student App v2 Implementation Plan](./student-app-v2-implementation-plan.md)

## Operations and Security

- [Security](./reference/SECURITY.md)
- [Runflare Deploy](./reference/RUNFLARE_DEPLOY.md)
- [Auth Sync Fix v1.3.3](./reference/AUTH_SYNC_FIX_v1.3.3.md)
- [Chat SSE](./reference/CHAT_SSE.md)
- [JSON Import Guide](./reference/JSON_IMPORT_GUIDE.md)

## Product and Planning

- [UI/UX Plan](./reference/UI_UX_PLAN.md)
- [Version Roadmap](./reference/VERSION_ROADMAP.md)

## Releases

- [Changelog](./releases/CHANGELOG.md)
- [Release Notes v1.4.0](./releases/RELEASE_NOTES_v1.4.0.md)
- [Release Notes v1.4.1](./releases/RELEASE_NOTES_v1.4.1.md)
- [Release Notes v1.4.2](./releases/RELEASE_NOTES_v1.4.2.md)

## Module Docs

### Backend v1

- [Backend README](./module-docs/backend/README.md)
- [Backend Changelog](./module-docs/backend/CHANGELOG.md)
- [Backend Runflare](./module-docs/backend/RUNFLARE.md)

### Backend v2

- [Backend v2 README](./module-docs/backend-v2/README.md)
- [Backend v2 API](./module-docs/backend-v2/API.md)
- [Backend v2 Architecture](./module-docs/backend-v2/ARCHITECTURE.md)
- [Backend v2 Test Report](./module-docs/backend-v2/TEST_REPORT.md)

### Admin v2

- [Admin v2 README](./module-docs/admin-v2/README.md)
- [Admin v2 Migration Guide](./module-docs/admin-v2/MIGRATION_GUIDE.md)
- [Admin v2 API Compatibility Report](./module-docs/admin-v2/API_COMPATIBILITY_REPORT.md)
- [Admin v2 Test Report](./module-docs/admin-v2/TEST_REPORT.md)

### Assets

- [Student App Icons](./module-docs/assets/student-app-icons.md)
- [Admin App Icons](./module-docs/assets/admin-app-icons.md)

## Blog-Style Reading Order

### 1. Understand the Running System

- [Repo Audit and Runbook](./REPO_AUDIT_AND_RUNBOOK.md)
- [Security](./reference/SECURITY.md)
- [Runflare Deploy](./reference/RUNFLARE_DEPLOY.md)

### 2. Understand the Migration

- [Migration v1 to v2](./migration-v1-to-v2.md)
- [Backend v2 Discovery](./backend-v2-discovery.md)
- [Student App v1 Backup Analysis](./student-app-v1-backup-analysis.md)

### 3. Continue Student App Migration

- [Student Core Architecture](./student-core-architecture.md)
- [Tauri Student App Architecture](./tauri-architecture.md)
- [Student App v2 Gap Analysis](./student-app-v2-gap-analysis.md)
- [Student App v2 Implementation Plan](./student-app-v2-implementation-plan.md)

### 4. Validate Releases

- [Changelog](./releases/CHANGELOG.md)
- [Release Notes v1.4.2](./releases/RELEASE_NOTES_v1.4.2.md)

## Maintenance Rules

- Put new markdown docs under `docs/`.
- Keep root `README.md` as the short project landing page only.
- Keep module-specific docs in `docs/module-docs/<module>/`.
- Keep release notes in `docs/releases/`.
- Keep operational references in `docs/reference/`.
- Add every new document to this dashboard.
