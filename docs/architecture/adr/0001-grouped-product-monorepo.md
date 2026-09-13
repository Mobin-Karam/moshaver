# ADR 0001: Grouped product monorepo

- Status: Accepted
- Date: 2026-09-13

## Context

Moshaver contains multiple deployable applications plus reusable contracts, runtime-neutral domain code, and a growing reusable backend platform initiative. The current top-level layout works but does not communicate the long-term distinction between deployables, reusable platform code, product-specific packages, and infrastructure adapters.

## Decision

Adopt a grouped product-monorepo architecture as the long-term repository model:

- deployable applications logically belong under `apps/`;
- reusable implementation/contracts logically belong under grouped `packages/`;
- repository tooling logically belongs under `tooling/` or repository-level automation folders;
- deployment/infra assets may migrate under `infra/` when useful;
- documentation, examples, `.github`, `.agents`, and Graphify remain repository-level concerns.

The decision is **logical first**. Existing source directories are not moved by this ADR.

## Consequences

Positive:

- ownership is clearer;
- CI can reason about affected deployables;
- CMB has a natural reusable package home;
- future project-graph tooling can enforce boundaries;
- AI agents have a stable project taxonomy.

Costs:

- a future physical normalization will require import/config/deployment updates;
- grouped packages add more project manifests;
- boundary enforcement requires maintenance.

## Alternatives considered

### Keep all projects at repository root forever

Low immediate cost, but weakens discoverability as package count grows.

### Put every project under one flat `packages/` directory

Simple for a small workspace, but hides the important difference between deployable apps, reusable CMB platform code, and product domain packages.

### Split into many repositories

Rejected for the current stage because Moshaver benefits from atomic contract changes, shared CI, synchronized backend/frontend development, and one dependency graph.
