---
description: Rules for NestJS, Prisma, PostgreSQL, APIs, and backend business logic.
applyTo: "cloud-api/**/*.{ts,js,json,prisma,sql}"
---

# Backend Engineering Rules

The backend uses technologies such as:

- NestJS
- Prisma
- PostgreSQL
- JWT authentication
- Passport
- Swagger
- DTO validation
- Guards
- Interceptors
- Exception filters
- Structured logging

Verify the current implementation before making changes.

## Request lifecycle

Follow this structure:

Request
→ Authentication
→ Tenant resolution
→ Authorization
→ DTO validation
→ Controller
→ Service
→ Prisma transaction
→ Response mapping

## Controllers

Controllers should:

- Define routes
- Apply authentication and permission requirements
- Validate input using DTOs
- Delegate business logic to services
- Return stable response shapes

Do not place large business workflows inside controllers.

## Services

Services should:

- Enforce business rules
- Scope tenant data
- Use transactions when multiple writes must succeed together
- Avoid leaking Prisma-specific objects unnecessarily
- Throw appropriate application exceptions

## Database

Before schema changes:

- Inspect existing models.
- Inspect migrations.
- Inspect seed scripts.
- Check current data compatibility.
- Add required indexes and constraints.
- Create a migration plan.
- Consider rollback and deployment order.

Never run destructive migrations automatically.

## API compatibility

When changing an endpoint, inspect:

- Frontend consumers
- Mobile consumers
- Tests
- Swagger
- Shared types
- Existing clients