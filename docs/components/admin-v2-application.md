# Moshaver Admin v2

Production-grade Vite + React + TypeScript migration target for the Admin application only.

## Development

```bash
npm install
npm run dev
```

Default URL: `http://localhost:8081`.

In dev mode, use the backend selector to switch the same-origin `/api/v2` proxy between the local backend (`http://localhost:4000/api/v2`) and the remote backend (`https://api.mahakaram.ir/api/v2`). The browser remains on the Admin origin so cookie sessions do not bypass the proxy or depend on cross-origin behavior. For startup defaults, set `VITE_API_URL`.

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

## Communication workspace

Live operations, Chat, and Notifications are one role-aware Communication section:

- `/admin/communication/live`
- `/admin/communication/chat`
- `/admin/communication/notifications`

The old flat paths redirect to their canonical Communication destinations and preserve query parameters. See the [Communication workspace contract](./admin-v2-communication-workspace.md) for API, realtime, authorization, and UI-state details.

## Administration workspace conventions

- `AdminLayout` owns the page title, description, and breadcrumbs; features do not repeat a hero title.
- Navigation is filtered by active role and capabilities. Write controls are gated separately from read routes.
- Students uses a directory/detail workflow. Users shares the reusable `shared/ui/admin-data-table.tsx` primitive and supports authorized batch status operations. Organizations uses a directory/workspace flow that can manage members without changing global context.
- `AdminDataTable` provides typed columns, controlled row selection, select-all-visible, clear selection, sortable headers, active rows, batch-action space, and loading/error/empty states. The feature supplies authorized operations and defines whether rows represent a page or all filtered results.
- System destinations are separate workspaces for health, releases, database operations, audit, and personal settings, using exact `/api/v2` capability boundaries.

Read the [developer handbook](../operations/developer-handbook.md) and [feature playbook](../operations/feature-and-bug-playbook.md) before adding an Admin workflow.

## Migration

`backup/admin-app-legacy/` is a byte-for-byte copy of the old static Admin app. Keep `admin-app/` deployed until v2 is validated, then switch static hosting to `admin-v2/dist` without changing backend or Student app.
