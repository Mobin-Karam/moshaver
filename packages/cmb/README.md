# CMB packages

Reusable packages for **Composable Modular Backend (CMB) Architecture**.

Rules:

- CMB packages must not import Moshaver product/application code.
- Public APIs are package entrypoints; consumers must not deep-import implementations.
- Kernel/foundation/platform code stays framework-neutral unless a package is explicitly an infrastructure/transport adapter.
- Product-specific event names, roles, persistence entities, and HTTP routes remain outside reusable packages.
- Every extraction must preserve existing application behavior through adapter/compatibility tests.

Current Phase-3 packages:

- `kernel` — module descriptors/tokens;
- `health` — generic liveness/readiness probes;
- `realtime` — generic in-memory user event hub.
