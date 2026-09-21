# `@moshaver/cmb-infrastructure`

Replaceable host-adapter registry and dependency-free development adapters for
cache, jobs, object storage, events, delivery, clocks, and IDs. Vendor adapters
belong outside domain packages and register under a stable port name. Required
adapters contribute readiness probes and fail startup/readiness when unavailable.
