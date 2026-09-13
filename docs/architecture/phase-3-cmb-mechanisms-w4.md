# Phase 3 — CMB mechanism split W4

## Status

W4 is implemented as a strict mechanism split. Education-specific handlers and projections remain Moshaver product code.

## Extracted packages

- `@moshaver/cmb-activity` owns generic presence-state normalization, heartbeat de-duplication, online/offline projection, and history limit bounds.
- `@moshaver/cmb-data-transfer` owns generic rejection of security-authority fields and safe numeric normalization for import pipelines.

## Product behavior retained

`ActivityService` continues to own the Moshaver event vocabulary, student/task resolution, TypeORM persistence, student authorization, and education attention signals. `ImportExportService` continues to own schema `2.0`, plan/task/exam/question codecs, scope checks, TypeORM transactions, and import history.

No route, DTO, schema version, database entity, or migration moves into the reusable packages.
