# API contract

Framework-free consumer-facing HTTP transport contracts for the stable Moshaver API.

## Authority

ADR 0003 defines this package as the canonical repository location for shared `/api/v2` transport shapes consumed across applications/packages.

It may contain stable request/response types, API envelope/error contracts, cursor/page shapes, synchronization contracts, and public role/capability codes when those values are part of the transport contract.

It intentionally contains **no** NestJS/Fastify controller code, TypeORM entities/database types, React/Tauri/browser runtime code, or client persistence schema.

Backend runtime DTOs/validators may remain in `backend-v2` during incremental migration, but stable shared contract elements must remain compatible with this package. Reusable CMB module/service contracts belong to the relevant CMB package, not here.

Breaking `/api/v2` changes require an explicit migration/deprecation path; see `docs/architecture/adr/0003-api-contract-authority.md`.
