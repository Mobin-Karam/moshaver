# Moshaver Admin v2

Production-grade Vite + React + TypeScript migration target for the Admin application only.

## Development

```bash
npm install
npm run dev
```

Default URL: `http://localhost:8081`.

In dev mode, use the backend selector in the lower-left corner to switch the same-origin `/api/v1` proxy between the local backend (`http://localhost:4000/api/v1`) and the remote backend (`https://api.mahakaram.ir/api/v1`). For startup defaults, set `VITE_API_URL`.

## Build

```bash
npm run build
```

Output: `dist/`.

## API

The client keeps the existing backend contract:

- cookie sessions with `credentials: include`
- CSRF token stored in `sessionStorage`
- one CSRF refresh/retry through `GET /auth/me`
- typed request wrapper and unified `ApiError`
- SSE through `GET /events`

## Migration

`backup/admin-app-legacy/` is a byte-for-byte copy of the old static Admin app. Keep `admin-app/` deployed until v2 is validated, then switch static hosting to `admin-v2/dist` without changing backend or Student app.
