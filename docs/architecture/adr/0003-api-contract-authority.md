# ADR 0003 — API contract authority and versioning

- **Status:** Accepted
- **Date:** 2026-09-13
- **Decision owners:** Moshaver architecture / CMB issue #27

## Context

`admin-v2` and `student-core` consume `@moshaver/api-contract`, while `backend-v2` historically implemented HTTP DTOs independently. That creates drift risk because the shared client contract and runtime validation layer can evolve separately.

Reusable CMB modules must also remain independent from NestJS controllers, HTTP envelopes, React clients, and Moshaver-specific transport layout.

## Decision

`packages/api-contract` is the canonical repository package for **consumer-facing HTTP transport contracts for the stable Moshaver API**, currently `/api/v2`.

It owns stable client-visible shapes such as shared request/response payload contracts, API envelopes and machine-readable error shapes, public role/capability codes, cursor/page contracts, and synchronization transport shapes.

It must remain framework- and runtime-neutral. It must not depend on NestJS, Fastify, TypeORM, React, Tauri, browser storage, or a concrete database schema.

### Backend responsibility

`backend-v2` remains the authoritative runtime implementation and validation boundary. Existing Nest/class-validator DTO classes may remain while migration is incremental, but repository checks must detect drift for stable shared contract elements.

Backend domain/application code must not depend on HTTP transport types merely to share logic. Controllers are adapters; reusable use-case/service contracts belong with their module/CMB public API.

### CMB contracts

CMB module contracts and ports are separate from the Moshaver HTTP contract package. Reusable CMB packages publish their own public module contracts from their package entrypoints.

Event contracts are also separate from HTTP contracts and should move to a dedicated contract package when cross-module event versioning is introduced.

## Versioning policy

The repository preserves `/api/v2` compatibility unless a breaking change is explicitly approved.

- **Patch:** documentation/typing corrections that do not change consumer semantics.
- **Minor:** backward-compatible additive fields, endpoints, enum/capability additions where old consumers continue to work.
- **Breaking:** removal/rename/type-semantic change of a public field, incompatible error/envelope change, or behavior requiring client migration. Breaking transport changes require a documented migration/deprecation path and normally a new API major such as `/api/v3`.

During the current private-package phase, package version numbers are informative; compatibility is enforced by repository CI and contract tests.

## Change rules

1. A public `/api/v2` contract change updates `@moshaver/api-contract` in the same PR when the shape is shared/public.
2. Backend runtime DTO/serialization changes must remain compatible with the canonical transport contract.
3. Frontends import the package public entrypoint only; deep imports are forbidden.
4. Product persistence entities never become transport-contract dependencies.
5. CMB kernel/platform packages never depend on Moshaver HTTP contracts unless acting explicitly as an application transport adapter.
6. Breaking changes require migration/deprecation documentation before merge.

## Consequences

- The client contract package is no longer ambiguous or merely advisory.
- Backend migration can remain incremental without making Nest DTO classes the cross-repository source of truth.
- CMB remains reusable because module contracts are not conflated with Moshaver HTTP DTOs.
- Issue #27 remains open for broader implementation work such as more route-level contract tests, a stable error-code catalog, thin-controller demonstrations, and non-HTTP use-case tests.
