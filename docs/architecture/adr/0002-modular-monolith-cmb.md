# ADR 0002: Modular monolith backend with CMB boundaries

- Status: Accepted
- Date: 2026-09-13
- Related: architecture epic #21

## Context

Moshaver's backend contains many product and cross-cutting modules. The same backend foundation is also intended to become reusable for unrelated products through CMB.

Premature microservice extraction would add deployment, networking, observability, transactional, and versioning complexity before those costs are justified.

## Decision

Keep Moshaver backend as a **modular monolith** while extracting reusable capability boundaries through CMB.

Architecture classes:

1. CMB kernel/foundation;
2. CMB platform modules;
3. infrastructure adapters;
4. Moshaver product/domain modules;
5. API application composition root.

Modules must have explicit public contracts and ownership. Internal separation should be strong enough that a module can later be extracted if a real operational requirement appears.

## Service extraction trigger

Consider a separate service only when at least one strong driver exists:

- independent scaling/resource profile;
- independent availability boundary;
- hard security/regulatory isolation;
- different runtime requirement;
- independent release/team ownership;
- measured bottleneck that module/process separation solves.

## Consequences

- local development and transactions remain simpler;
- CMB reuse can progress without distributed-system overhead;
- module boundaries become the unit of architecture rather than service count;
- future service extraction remains possible because public contracts are explicit.
