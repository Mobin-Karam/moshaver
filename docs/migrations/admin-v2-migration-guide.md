# Admin v2 Migration Guide

1. Keep `admin-app` as the production app during validation.
2. Use `backup/admin-app-legacy` as the rollback copy.
3. Run the backend unchanged on `localhost:4000`.
4. Start v2 with `cd admin-v2 && npm install && npm run dev`.
5. Validate login, refresh restore, logout, planner import, exam builder, chat, reports, notifications, and sessions.
6. Build with `npm run build`.
7. Deploy `admin-v2/dist` to the existing Admin static host after validation.

No backend API contract or Student app route changes are required.
