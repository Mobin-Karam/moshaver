# Admin v2 test snapshot

Historical verification snapshot. Re-run the current package commands before using these results as release evidence.

Implemented test entry points:

- `npm run test`
- `npm run test:e2e`
- `npm run build`

Manual validation checklist remains required against a running backend:

- Login and admin role rejection
- Session restore via `GET /auth/me`
- Logout and CSRF clearing
- Planner JSON preview and commit
- Publish range
- Exam creation and question creation
- Chat send and SSE invalidation
- Notifications/advisor inbox
- Reports range filtering

Automated tests can be expanded after package installation and backend fixture setup.
