# Backend v2 Architecture

Backend v2 is a separate service from `backend/` v1. It uses Nest modules for domain boundaries and TypeORM repositories for persistence.

## Layers

- Controllers: HTTP routing only.
- DTOs: request validation.
- Services: application behavior and business orchestration.
- Repositories: TypeORM repository access injected into services.
- Entities: database schema and relationships.
- Common: guards, filters, interceptors, decorators, utilities.

## Modules

- `auth`: sessions, cookies, CSRF
- `students`: student dashboards and student-facing data
- `plans`: plan import, preview, publish foundation
- `exams`: exam creation, question import, attempt lifecycle
- `sync`: future Tauri offline-first sync boundary
- `realtime`: RxJS-backed SSE
- `notifications`: push-ready notification creation
- `analytics`: health score and recommendation foundation
- `admin`: React Admin v2 endpoints

## Migration Boundary

Backend v2 does not mutate the v1 SQLite schema. Production migration must export from v1 and import into v2 through validated DTOs.
