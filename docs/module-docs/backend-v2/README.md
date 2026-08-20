<!-- DOCS_NAV_START -->
[Docs Home](../../README.md) | [Runbook](../../REPO_AUDIT_AND_RUNBOOK.md) | [Student v2 Gaps](../../student-app-v2-gap-analysis.md) | [Student Core](../../student-core-architecture.md) | [Tauri](../../tauri-architecture.md)
<!-- DOCS_NAV_END -->
# Moshaver Backend v2

NestJS + Fastify + TypeORM backend foundation for Moshaver v2.

## Stack

- NestJS
- Fastify adapter
- TypeScript
- TypeORM
- SQLite with `better-sqlite3`
- PostgreSQL-ready datasource configuration
- Session cookies + CSRF token
- SSE realtime events

## Development

```bash
npm install
cp .env.example .env
npm run migration:run
npm run seed
npm run dev
```

Service URLs:

- Health: `http://localhost:4000/health`
- Ready: `http://localhost:4000/ready`
- API: `http://localhost:4000/api/v2`

Default seed users:

- username: `admin`
- password: `anonymous`

Student login:

- username: `sara`
- password: `12345678sara`

## Production Notes

- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to the exact browser origins that may call the API, for example `https://st.mahakaram.ir,https://admin.mahakaram.ir`.
- Set `COOKIE_SECURE=1` and `COOKIE_SAMESITE=none`.
- Keep `DATABASE_TYPE=sqlite` for current deployment.
- Switch to `DATABASE_TYPE=postgres` and `DATABASE_URL=...` after migration validation.
- Do not point `/api/v1` clients at backend v2 until parity is complete.
