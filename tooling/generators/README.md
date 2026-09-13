# Repository generators

## CMB package

```bash
npm run generate:cmb -- <id> [foundation|platform|adapter] [comma-separated-dependencies]
```

The command refuses invalid identifiers, self-dependencies, and existing target directories. It creates the package manifest, public CommonJS entrypoint, TypeScript declarations, descriptor test, and ownership README.

After generation, add the project and its consumer edges to `tooling/workspace/projects.json`, run `npm install` in the package to create its leaf lockfile, and run:

```bash
npm run workspace:check
npm run architecture:check
```

The generator deliberately does not guess consumers or mutate the project DAG because those are architecture decisions.

## Product package

```bash
npm run generate:product -- <id> [comma-separated-public-package-dependencies]
```

This creates a runtime-neutral product ownership shell under `packages/product/<id>`. Dependency versions are deliberately emitted as `workspace-contract-required` placeholders so a generated package cannot be installed until an engineer maps each dependency to an explicit local package path and declares it in the project DAG.
