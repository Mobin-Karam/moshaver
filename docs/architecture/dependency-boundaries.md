# Dependency boundaries

These rules apply logically today even before physical directory migration.

## Layers

From highest-level/most product-specific to lowest-level/most reusable:

```text
L5  Applications / composition roots
L4  Product domains and frontend product features
L3  Reusable platform modules (CMB)
L2  Foundation contracts and kernel
L1  Ports / runtime-neutral primitives

Concrete infrastructure adapters implement L1/L2 contracts and are wired by L5.
```

A layer may depend on the same layer or lower layers only when the dependency does not create a cycle. Lower layers must not import higher layers.

## Allowed matrix

| From | May depend on | Must not depend on |
| --- | --- | --- |
| API app | product, CMB, contracts, adapters | other app internals |
| Admin app | API contracts, admin-owned libs, approved shared UI | backend implementation, Student private code |
| Student app | student-core, API contracts, student-owned libs, approved shared UI | backend implementation, Admin private code |
| Product backend module | CMB public APIs, contracts, its own persistence | another module's private entities/services |
| CMB platform module | CMB kernel/contracts, declared platform dependencies | Moshaver product modules |
| CMB kernel | language/framework-neutral or deliberately foundational dependencies | product modules, product roles, product DTOs |
| `student-core` | contracts/runtime-neutral helpers | React, DOM, Tauri, browser storage, concrete DB clients |
| Infrastructure adapter | port/contracts it implements, vendor SDK | product decision logic |

## Cross-module communication

Prefer, in this order:

1. public application/service contract for synchronous use cases;
2. explicit event contract for asynchronous/cross-cutting propagation;
3. shared foundation type only for genuinely stable common semantics.

Do not solve module coupling by importing another module's repository, entity, controller, or private helper directly.

## Database ownership

- Every table/entity/migration has an owning module or platform package.
- A module may not write another module's private table directly.
- Cross-module transactional operations should use explicit application services and documented transaction boundaries.
- Shared platform tables (sessions, memberships, notification state, audit entries) have platform ownership rather than arbitrary product ownership.

## API ownership

- Transport controllers are adapters around application use cases.
- DTOs and public schemas belong to the capability exposing them.
- Client-shared schemas/types are published through explicit contract packages.
- Frontends never infer backend internals from database entities.

## Frontend dependency rule

Feature code follows roughly:

```text
route/page
  ↓
feature orchestration
  ↓
feature UI + data-access
  ↓
shared UI / API contracts / utilities
```

Do not create a universal frontend `shared/` folder that mixes API clients, product business logic, UI primitives, and utilities.

## Circular dependency policy

Circular project/module dependencies are forbidden. When a cycle appears, resolve ownership rather than adding forward references as the architectural solution.

## Graph enforcement

Graphify should be used to identify actual dependency paths before shared-contract or CMB changes. Future workspace tooling may add automated boundary tags/rules, but the policy in this document is tool-independent.
