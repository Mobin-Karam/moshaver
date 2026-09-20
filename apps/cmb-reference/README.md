# CMB reference service

A minimal, non-education Node.js service proving that the CMB kernel and health
module work without NestJS, TypeORM, or Moshaver domain roles. It exposes health,
readiness, module metadata, cookie sessions with CSRF protection, durable
notifications, realtime publication, and a tiny notes use case with generic
`VIEWER` and `OPERATOR` roles/capabilities. The note store and notification
delivery provider are injected ports and are replaced in tests.

```bash
npm ci
npm test
PORT=3000 npm start
```

Set `DISABLED_MODULES` to a comma-separated module list. Startup fails when a
required dependency is disabled.
