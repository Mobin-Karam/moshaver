---
name: backend-development
description: Implement, repair, refactor, and validate NestJS backend features. Use for modules, controllers, services, DTOs, guards, Prisma queries, transactions, Swagger, validation, business logic, tenant isolation, and API testing.
---

# Backend Development Skill

## Workflow

1. Locate the module owning the feature.
2. Inspect controller, service, DTO, guards, Prisma models, and tests.
3. Identify frontend and mobile consumers.
4. Define the expected request and response contract.
5. Confirm authentication, role, permission, and tenant requirements.
6. Implement the smallest complete backend change.
7. Use transactions for atomic multi-write operations.
8. Update Swagger and shared types.
9. Add unit or integration tests.
10. Run lint, type checking, tests, Prisma validation, and build.

## Endpoint checklist

For each endpoint verify:

- HTTP method
- Route
- Authentication
- Account type
- Tenant context
- Permission
- Request DTO
- Validation
- Service operation
- Database scope
- Response type
- Error behavior
- Swagger documentation

## Prisma requirements

- Select only needed fields where practical.
- Avoid unbounded queries.
- Prevent N+1 queries.
- Use unique constraints consistently.
- Preserve relations and referential integrity.
- Never trust a client-provided `tenantId` without authorization checks.

## Completion criteria

A backend task is complete only when:

- The endpoint is implemented.
- Tenant isolation is enforced.
- Authorization is enforced.
- DTO validation exists.
- Errors are mapped correctly.
- Swagger is updated.
- Tests and build checks pass.