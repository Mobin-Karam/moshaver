# Dual API deployment

This deployment keeps the legacy and v2 databases isolated and exposes both
backends through one origin:

- `/api/v1/*` routes to `v1.4/backend`.
- `/api/v2/*` routes to `backend-v2`.
- `/health` reports the v2 backend health.

Copy deployment secrets into an environment file (do not commit it), then run:

```bash
docker compose --env-file .env.production -f docker-compose.dual-api.yml up -d --build
```

Required environment values are `CORS_ORIGINS`, `ADMIN_USERNAME`, and
`ADMIN_PASSWORD`. Point the public API domain at `API_PORT` (default `4000`).

For `admin-v2`, set `VITE_API_URL=https://api.example.com` and choose the
default with `VITE_API_VERSION=v1` or `VITE_API_VERSION=v2`. A full URL ending
in `/api/v1` or `/api/v2` remains supported for existing deployments.

The two API versions intentionally use different session cookie names and
different database volumes. Signing into one version does not sign the user
into the other. Migrate data explicitly before making v2 the production
default; never point both services at the same SQLite file.
