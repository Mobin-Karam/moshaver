# Moshaver v2 PaaS deployment

The current production topology is three Docker services: one API, one Student web service, and one Admin web service. SQLite is the active database, so the API must run as exactly one replica with a persistent disk mounted at `/data`. Do not enable horizontal API scaling until the PostgreSQL adapter and migration path have been validated.

## Service definitions

| Service | Dockerfile | Internal port | Persistent storage | Health check |
| --- | --- | ---: | --- | --- |
| API | `apps/api/Dockerfile` with repository-root build context | 4000 | `/data` | `GET /ready` |
| Student | `apps/student/Dockerfile` with repository-root build context | 80 | none | `GET /` |
| Admin | `apps/admin/Dockerfile` with repository-root build context | 80 | none | `GET /` |

Build both web images with `VITE_API_URL=/api/v2`. Set `API_PROXY_TARGET` in each web service to the PaaS private URL for the API, including its port when required. Browser traffic then stays same-origin and the nginx containers proxy `/api/v2` to the API.

## Required API configuration

```dotenv
NODE_ENV=production
PORT=4000
DATABASE_TYPE=sqlite
DATABASE_PATH=/data/moshaver-v2.sqlite
CORS_ORIGINS=https://student.example.com,https://admin.example.com
COOKIE_SECURE=1
COOKIE_SAMESITE=none
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
SQLITE_BUSY_TIMEOUT_MS=5000
TRUST_PROXY=1
```

Use `COOKIE_SAMESITE=lax` only when both web applications and the API are served from a same-site domain arrangement. Secure cookies are mandatory in production. Configure the PaaS to terminate TLS and forward the original protocol.

Set `TRUST_PROXY=1` only when the API is reachable exclusively through a trusted PaaS ingress that overwrites forwarded-client headers. This preserves real client IPs for signup/login throttling and audit logs without trusting spoofed headers on a directly exposed process.

No seed command belongs in production startup. TypeORM runs committed migrations during API initialization. Development/demo seed commands deliberately reject `NODE_ENV=production`.

## Release procedure

1. Create and verify a snapshot of the `/data` disk.
2. Build immutable images from the intended commit.
3. Deploy the API with one replica and wait for `/ready` to return HTTP 200.
4. Deploy Student and Admin with the private API target.
5. Smoke-test login, `/api/v2/me/context`, Student signup, Admin JSON catalog download, and one authenticated mutation with CSRF.
6. Confirm logs contain no migration, database, CORS, or cookie errors.

Verify the public Student hostname is attached to the v2 Student service—not the
legacy v1 application—and that its API path is a real JSON proxy:

```bash
node tooling/deployment/verify-student-production.mjs https://student.example.com
```

This check rejects a legacy or wrong web artifact, SPA HTML returned from an API
URL, broken direct-route fallback, malformed OpenAPI output, and a cacheable
service worker. A root-page HTTP 200 by itself is not deployment evidence.

Rollback means restoring the previous images. If a migration is not backward-compatible, restore the matching pre-release disk snapshot as a coordinated maintenance operation; never run a demo reset or seed against the production disk.

## Local production-topology check

Production cookies are secure by default and therefore require HTTPS. For an HTTP-only local Compose smoke test, explicitly override them only for that command:

```bash
COOKIE_SECURE=0 COOKIE_SAMESITE=lax docker compose up --build
```

The deployment-readiness CI performs the equivalent immutable-image startup with
`docker compose up --wait`, verifies API liveness/readiness, both web roots, and
both same-origin `/api/v2/openapi.json` proxy paths, then removes the disposable
containers and volume. A failed smoke attaches container status and logs.

Before a public deployment, remove those overrides and verify that the public endpoints use HTTPS.
