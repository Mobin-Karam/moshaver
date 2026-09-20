# `@moshaver/cmb-persistence`

Framework-neutral migration ownership and transaction contracts. Each migration
uses `module:YYYYMMDDHHMMSS:name`, declares dependencies explicitly, and is ordered
deterministically. Database-specific execution remains in a host adapter.
