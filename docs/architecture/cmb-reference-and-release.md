# CMB reference, compatibility, and release policy

## Purpose

CMB is the framework-neutral reusable backend layer below Moshaver product code.
The executable proof is `apps/cmb-reference`: a plain Node.js notes service with
generic `VIEWER` and `OPERATOR` roles, an injected store, health/readiness probes,
and module metadata. It must never import an education domain or NestJS adapter.

## Quick start

```bash
cd apps/cmb-reference
npm ci
npm test
PORT=3000 npm start
```

Create another service with the same safe baseline:

```bash
npm run generate:cmb-app -- --target=apps/example-service --name=example-service
cd apps/example-service
npm install
npm test
```

The generator only writes a new in-repository directory and refuses overwrite.

## Module and public API contract

- `@moshaver/cmb-kernel` owns descriptors, stable tokens, dependency resolution,
  and ordered start/reverse-stop lifecycle hooks.
- Foundation/platform packages expose only their package-root `exports` entry.
- Application adapters may depend on CMB; CMB cannot depend on application or
  product packages.
- A module can be disabled only when no enabled module requires it. Unknown,
  duplicate, missing, disabled, or circular dependencies fail before serving.
- Replaceability is demonstrated through constructor-injected ports; the
  reference service replaces its note store in tests.

## Compatibility matrix

| Consumer | CMB line | Node line | Guarantee |
| --- | --- | --- | --- |
| Moshaver API v2 | `0.1.x` | Node 22 | Source and behavior compatibility verified by repository CI |
| CMB reference service | `0.1.x` | Node 22 | Framework/domain independence and starter smoke tests |

All CMB packages currently remain private and versioned `0.1.0`. Until a first
public `1.0.0`, a minor release may change APIs; every such change must update all
consumers atomically in this repository. Patch releases must remain compatible.

## Release procedure

1. Update the changed package version and public type declarations together.
2. Add behavior tests at the public entrypoint; never test private deep imports.
3. Run `npm run workspace:check`, `npm run architecture:check`,
   `npm run contracts:check`, `npm run test:generators`, and `npm run verify`.
4. Confirm the fresh-database migration and authorization-matrix CI jobs pass.
5. Record intentional breaking changes and the consumer migration in release notes.
6. Publish packages only after removing `private: true` through a separately
   reviewed release change. The current repository does not publish CMB packages.

## API evolution and errors

Moshaver HTTP compatibility remains `/api/v2`; reusable packages do not own that
route version. Breaking transport changes require a new API version or a documented
deprecation window. Deprecations must identify the replacement and removal release.
Errors use the documented `ApiError` envelope and stable machine-readable `code`;
clients must not branch on human-readable messages.

## CI evidence

`cmb-packages-quality.yml` tests every package, the non-education service, generator,
architecture boundaries, and contracts. `backend-v2-quality.yml` additionally runs
all migrations against an empty SQLite database and exercises the complete security
role matrix against a disposable database. `deployment-readiness.yml` validates and
builds production container definitions.
