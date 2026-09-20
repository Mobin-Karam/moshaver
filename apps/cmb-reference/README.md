# CMB reference service

A minimal, non-education Node.js service proving that the CMB kernel and health
module work without NestJS, TypeORM, or Moshaver domain roles. It exposes health,
readiness, module metadata, and a tiny notes use case with generic `VIEWER` and
`OPERATOR` roles. The note store is an injected port and is replaced in tests.

```bash
npm ci
npm test
PORT=3000 npm start
```

Set `DISABLED_MODULES` to a comma-separated module list. Startup fails when a
required dependency is disabled.
