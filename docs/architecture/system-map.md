# Moshaver system map

This is the shortest reliable map of the system currently present in the repository. It describes source layout and wiring inspected on 2026-09-02; release readiness still depends on the validation gates in the [repository runbook](../operations/repository-runbook.md).

## Two product generations coexist

| Generation | Applications | API | Persistence | Intended use |
| --- | --- | --- | --- | --- |
| v1.4 line | `v1.4/admin-app`, `v1.4/student-app` | `v1.4/backend`, `/api/v1` | Node SQLite at a configured file path | Stable legacy/product line and Runflare deployment |
| v2 line | `admin-v2`, `student-app-v2` | `backend-v2`, `/api/v2` | TypeORM with SQLite now and a PostgreSQL configuration path | Active migration and root Compose stack |

The generations are separate contracts. A v1 client must not be pointed at `/api/v2` merely because both services use port `4000` in their own launch modes.

## Runtime relationships

```text
Browser: student-app-v2 :8080 ─┐
                               ├─ same-origin /api/v2 proxy ─> backend-v2 :4000
Browser: admin-v2 :8081 ───────┘                                  │
                                                                  └─ SQLite volume

Browser: v1.4/student-app ─────┐
                               ├─ same-origin /api/v1 proxy ─> v1.4/backend
Browser: v1.4/admin-app ───────┘                              │
                                                             └─ SQLite file

student-app-v2 ─> @moshaver/student-core ─> storage, notification, clock,
                                           API, and sync provider interfaces
student-app-v2 ─> Tauri v2 shell for native desktop/Android builds
```

## Root-level source ownership

| Path | Ownership |
| --- | --- |
| `backend-v2/` | NestJS/Fastify `/api/v2`, TypeORM entities/migrations, auth, admin, student, learning, plans, tasks, exams, chat, reports, realtime, notifications, and sync modules |
| `admin-v2/` | React/Vite/TypeScript administration UI organized by feature |
| `student-app-v2/` | React/Vite student UI, PWA adapters, sync layer, and Tauri v2 shell |
| `student-core/` | Framework-neutral student domain types and provider interfaces |
| `v1.4/` | Self-contained dependency-light Node/SQLite backend and Vanilla JS Admin/Student PWAs |
| `backup/` | Rollback/reference copies; not an active runtime |
| `deploy/` | Deployment and dual-API proxy material |
| `examples/` | Planner/exam JSON examples |
| `scripts/`, `tests/` | Repository helpers; some still target paths from the pre-`v1.4/` layout, as documented in the runbook |

## Root Compose is v2

`docker-compose.yml` builds `backend-v2`, `student-app-v2`, and `admin-v2`. The frontends receive `/api/v2` at build time and proxy it to `backend-v2`. The backend uses the `moshaver_v2_sqlite` volume at `/data/moshaver-v2.sqlite`.

The v1.4 Runflare deployment is documented separately because its services and data are under `v1.4/` and use `/api/v1`.

## Important boundaries

- Authentication is cookie/session based; mutating requests use CSRF protection.
- Browser origins and API base paths are different concepts. CORS allows browser origins; frontend API configuration selects `/api/v1` or `/api/v2`.
- Backend notifications are durable state. SSE is a live in-app signal; Web Push is optional delivery.
- `student-core` must remain UI- and runtime-agnostic. Web storage and Tauri SQLite are adapters in `student-app-v2`.
- Database migration and client replacement are separate release gates. Never overwrite a v1 database as a routine migration test.

## Where to continue

- To run or validate: [repository runbook](../operations/repository-runbook.md)
- To change v1.4: [v1.4 runtime architecture](./backend-v1-4-runtime.md)
- To change v2 backend: [backend v2 design](./backend-v2-design.md) and [HTTP API](../components/backend-v2-http-api.md)
- To assess incomplete parity: [migration documents](../migrations/)
- To deploy v1.4: [Runflare guide](../operations/runflare-v1-4-deployment.md)
