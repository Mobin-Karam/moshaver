# Moshaver Backend v1.4.2

Node.js 22 + built-in SQLite API for Moshaver | مشاور.

Run locally:

```bash
cp .env.development.example .env
npm run dev:watch
```

Security/realtime highlights: HttpOnly cookie sessions, per-session CSRF, exact credentialed CORS, persistent login throttling, versioned scrypt password hashes, audit logs, SSE event replay, REST chat, server-authoritative study/report metrics, WAL + foreign keys.

Health endpoints: `/`, `/health`, `/ready`, `/api/v1/health`, `/api/v1/ready`.

For the existing Runflare deployment keep `DATABASE_PATH=/data/konkur.sqlite` so the existing disk remains the source of truth.
