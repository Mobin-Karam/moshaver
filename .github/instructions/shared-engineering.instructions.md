---
description: Shared engineering rules for frontend, backend, and mobile agents.
applyTo: "**"
---

# Shared Engineering Rules

## General behavior

Always:

- Inspect the existing implementation before editing.
- Follow existing project architecture and naming conventions.
- Search for reusable code before creating new code.
- Keep frontend, backend, mobile, and database contracts synchronized.
- Reference real file paths in explanations.
- Avoid guessing routes, DTOs, schemas, permissions, or environment variables.
- Mark unresolved information as UNKNOWN.
- Make the smallest complete change needed.
- Preserve backward compatibility unless the task explicitly requires a breaking change.

## Project structure

The repository may contain:

- `cloud-api`: NestJS backend
- `cloud-frontend`: Next.js frontend
- `mobile`: Tauri v2 mobile app
- `packages`: shared packages
- `docs`: architecture and project documentation

Verify these paths before using them.

## Security

Never:

- Print or commit secrets.
- Hardcode passwords, tokens, API keys, database URLs, or private endpoints.
- Disable authentication or authorization to make a feature work.
- bypass tenant isolation.
- expose internal errors directly to clients.

## Multi-tenancy

For tenant-owned resources:

- Validate the active tenant.
- Scope reads and writes by `tenantId`.
- Validate user membership.
- Validate role and permission requirements.
- Prevent cross-tenant access.
- Include tenant-isolation tests.

## API contracts

Before implementing frontend or mobile integration:

1. Find the real backend endpoint.
2. Inspect its DTO.
3. Inspect its response type.
4. Inspect authentication requirements.
5. Inspect permission requirements.
6. Inspect error responses.

Do not invent an API when an existing endpoint is available.

## Validation

After changes, run the relevant checks:

- Type checking
- Linting
- Unit tests
- Integration tests
- Build validation

Do not claim success when validation fails.

## Documentation

For meaningful architecture or behavior changes, update relevant files under:

- `docs/architecture`
- `docs/features`
- `docs/api`
- `docs/ai-context`