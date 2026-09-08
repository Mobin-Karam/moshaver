# Moshaver v2 system map

This map describes the active source on `main` and `develop`, inspected on 2026-09-08.

## Runtime relationships

```text
Browser: student-app-v2 :8080 ─┐
                               ├─ same-origin /api/v2 proxy ─> backend-v2 :4000
Browser: admin-v2 :8081 ───────┘                                  │
                                                                  └─ TypeORM database

student-app-v2 ─> @moshaver/student-core ─> runtime provider interfaces
student-app-v2 ─> web/PWA adapters or Tauri v2 shell
```

## Source ownership

| Path | Ownership |
| --- | --- |
| `backend-v2/` | NestJS/Fastify `/api/v2`, TypeORM entities and migrations, auth, RBAC, and product modules |
| `admin-v2/` | React/Vite administration application organized by feature |
| `student-app-v2/` | React/Vite student UI, PWA adapters, synchronization, and Tauri shell |
| `student-core/` | Framework-neutral student domain types and provider contracts |
| `docs/` | Current v2 documentation plus clearly identified migration/history evidence |
| `examples/` | Import and domain examples used by v2 workflows |

Root `docker-compose.yml` is the canonical container topology. Both frontends use `/api/v2` and proxy to `backend-v2`; the backend persists SQLite in the `moshaver_v2_sqlite` volume by default.

## Security and data boundaries

- Authentication is session based and mutating requests require CSRF protection.
- Backend capability checks are authoritative; frontend role gating improves navigation but is not a security boundary.
- Organization scope and resource ownership must be validated server-side.
- `student-core` stays UI- and runtime-independent; platform storage and notifications belong in adapters.
- Migrations and seed/reset work must target disposable data unless an explicit reviewed production procedure applies.

## Archived v1.4 line

The v1.4 Node/SQLite backend and Vanilla JavaScript applications are preserved on `archive/v1.4` at `cf63c233bce116371519fef61c231143bbd902b1`. Use a separate worktree as described in the [repository runbook](../operations/repository-runbook.md#access-the-v14-archive). Migration and historical documents in this branch are evidence, not active runtime contracts.

## Continue reading

- [Repository runbook](../operations/repository-runbook.md)
- [Backend v2 design](./backend-v2-design.md)
- [Backend v2 HTTP API](../components/backend-v2-http-api.md)
- [Admin v2 application](../components/admin-v2-application.md)
- [Student v2 and Tauri runtime](./student-v2-tauri-runtime.md)
