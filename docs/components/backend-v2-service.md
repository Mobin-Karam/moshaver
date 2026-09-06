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

### Admin v2 role demo accounts

For a disposable development database, seed every Admin v2 role with:

```bash
npm run seed:demo
```

The Admin v2 development login screen then offers one-click account selection for guardian, advisor, teacher, mentor, content manager, organization administrator, platform administrator, and a multi-role account. All use the development-only password `Moshaver-e2e-2026!`. The seed refuses to run with `NODE_ENV=production`; never use these identities or this password in a deployed environment.

## Production Notes

- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to the exact browser origins that may call the API, for example `https://st.mahakaram.ir,https://admin.mahakaram.ir`.
- Set `COOKIE_SECURE=1` and `COOKIE_SAMESITE=none`.
- Keep `DATABASE_TYPE=sqlite` for current deployment.
- Switch to `DATABASE_TYPE=postgres` and `DATABASE_URL=...` after migration validation.
- Do not point `/api/v1` clients at backend v2 until parity is complete.
