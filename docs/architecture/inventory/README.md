# Architecture inventory

This directory contains source-derived inventories used to migrate the current Moshaver v2 layout toward the grouped product-monorepo and CMB boundaries defined in `ARCHITECTURE.md`.

## Current inventory

- [`backend-v2-module-inventory.md`](./backend-v2-module-inventory.md) — classification of every backend module directory and extraction readiness.
- [`backend-v2-module-inventory.json`](./backend-v2-module-inventory.json) — machine-readable version of the backend inventory.
- [`backend-v2-dependency-map.md`](./backend-v2-dependency-map.md) — observed Nest module dependencies, high-coupling nodes, and hidden data coupling.
- [`project-consumers.md`](./project-consumers.md) — current package/project consumer relationships across backend, Admin, Student, student-core, and shared contracts.

## Evidence policy

These files are derived from source on `develop` at commit `e6185d391030bb012aad8404bd61b5b91ab964ab`.

They are **not** generated Graphify output. At the time of this inventory, `graphify-out/graph.json` is not committed. Once a current Graphify graph exists, compare it against this inventory and resolve discrepancies in favor of verified current source.

Do not use a generic-looking module name as proof that the module is reusable. Extraction readiness is based on imports, persistence ownership, product entities, policies, and orchestration responsibilities.
