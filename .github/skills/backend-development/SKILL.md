---
name: backend-development
description: Implement, repair, refactor, optimize, and validate backend features across Node.js and other server-side projects. Use for routes, controllers, handlers, services, validation, authentication, authorization, database queries, migrations, transactions, business logic, realtime APIs, background jobs, API contracts, observability, and backend testing. Adapt to the project's existing framework, database, and architecture instead of assuming NestJS, Prisma, Swagger, or multitenancy.
---

# Backend Development Skill

## Core Principle

Inspect the backend before choosing implementation patterns.

Do not assume the project uses:

- NestJS
- Express
- Fastify
- Prisma
- an ORM
- PostgreSQL
- Swagger/OpenAPI
- DTO classes
- dependency injection
- multitenancy
- REST

A native HTTP server, custom router, SQLite database, local modules, or another lightweight architecture can be completely valid.

Preserve the project's architectural style unless the user explicitly requests a migration.

## Architecture Discovery

Before editing, determine where applicable:

- Runtime and version
- Language
- Framework or native HTTP layer
- Application entry point
- Router/controller/handler structure
- Service/domain organization
- Database engine
- Database access layer or ORM
- Schema/migration system
- Authentication mechanism
- Session/token storage
- CSRF model
- Authorization model
- Tenant/workspace model if any
- Validation approach
- Error handling
- API documentation
- Realtime mechanisms
- Background jobs
- Logging/observability
- Test framework
- Deployment/runtime constraints

## Workflow

1. Locate the domain owning the feature.

2. Inspect relevant:
   - routes/controllers/handlers,
   - services/domain logic,
   - validation,
   - database access,
   - authorization,
   - migrations,
   - tests.

3. Identify frontend, mobile, CLI, webhook, or external consumers when relevant.

4. Define or verify the expected request and response contract.

5. Confirm:
   - authentication,
   - authorization,
   - ownership/scope,
   - tenant/workspace rules if applicable.

6. Identify data-integrity and concurrency requirements.

7. Create a focused implementation plan.

8. Implement the smallest complete backend change.

9. Use a transaction when multiple writes must succeed or fail atomically.

10. Update API documentation/shared contracts if the project maintains them.

11. Add or update focused automated tests.

12. Run the project's available:

- syntax checks,
- lint,
- type checks,
- unit tests,
- integration tests,
- smoke tests,
- migration validation,
- build.

13. Report:

- changed files,
- API/schema changes,
- validation performed,
- migration/deployment risks.

## Endpoint Checklist

For each endpoint or equivalent API operation, verify where applicable:

- HTTP method or protocol operation
- Route/path/event name
- Authentication
- Authorization
- Role/permission
- Resource ownership
- Tenant/workspace scope
- Path parameters
- Query parameters
- Request body
- Validation
- Business operation
- Database scope
- Transaction boundary
- Response shape
- Status code
- Error behavior
- Pagination/limits
- Rate limiting
- Audit requirements
- API documentation

Only require concepts that exist in the project.

For example, do not require a tenant context for a single-tenant application.

## Layering

Prefer clear separation of concerns appropriate to the project's size.

A useful general flow is:

route/handler
↓
validation + authorization
↓
service/domain logic
↓
repository/database

But do not introduce layers purely for ceremony.

Small applications may legitimately combine some responsibilities.

Extract modules when doing so reduces meaningful complexity, duplication, or coupling.

Validation

Validate all untrusted external inputs.

This may include:

body
query parameters
path parameters
headers
cookies
uploaded files
webhook payloads
realtime messages

Use the validation approach already present in the project.

Do not introduce a schema library solely because the skill mentions validation.

Authentication and Sessions

Follow the application's actual authentication model.

Possible valid approaches include:

cookie sessions,
bearer tokens,
access/refresh tokens,
API keys,
signed requests,
external identity providers.

Verify where relevant:

login
logout
expiration
revocation
rotation
secure storage
cookie flags
CSRF
rate limiting
password handling
session cleanup

Never log raw passwords, session secrets, access tokens, refresh tokens, or CSRF secrets.

Authorization

Authorization must be enforced server-side.

Check where relevant:

role,
permission,
ownership,
assigned relationship,
tenant/workspace,
resource state.

Never trust identifiers supplied by the client without checking whether the authenticated actor is allowed to operate on that resource.

Frontend hiding is not authorization.

Database

Follow the existing persistence technology.

Possible valid approaches include:

raw SQL,
prepared statements,
query builders,
ORMs,
document databases,
key-value databases.

General requirements:

use parameterized queries,
avoid unbounded result sets,
paginate large collections,
prevent N+1 patterns,
preserve referential integrity,
use indexes based on real access patterns,
inspect query plans for important slow queries,
avoid selecting unnecessary large fields where meaningful.

Do not migrate databases or introduce an ORM without a clear requirement.

Migrations

Schema changes should be explicit and repeatable.

Prefer:

ordered migrations,
migration history,
safe forward application,
documented backfills,
deployment-aware changes.

For production data changes:

preserve existing data,
account for partially upgraded deployments where relevant,
back up critical data,
avoid destructive schema changes without an explicit migration strategy.
Transactions

Use transactions when several related changes form one logical operation.

Examples:

order + payment state
exam submission + answers + score
import commit
plan replacement
inventory update + history
account creation + related profile records

Keep transactions as short as practical.

Do not wrap unrelated read-only operations in transactions without reason.

Concurrency and Idempotency

For operations that may be retried or performed concurrently, consider:

uniqueness constraints,
idempotency keys,
optimistic concurrency,
state checks,
transactions,
duplicate-event protection.

Especially review:

payments,
imports,
submissions,
job execution,
webhook processing,
retries.
Realtime

If the project uses:

Server-Sent Events,
WebSockets,
long polling,
message brokers,
database-backed events,

preserve the existing approach unless a migration is explicitly required.

Verify where applicable:

authorization,
reconnect behavior,
replay,
ordering,
duplicate events,
cleanup,
retention.
Background Jobs

If the application has asynchronous jobs:

make jobs idempotent where practical,
handle retries,
record failures,
enforce appropriate concurrency,
avoid losing work silently.

Do not add a queue/broker when a simple scheduled/local task is sufficient for the project's scale.

API Documentation

Update the documentation system the project actually uses.

This may be:

OpenAPI/Swagger
generated schema
Markdown API docs
shared TypeScript types
protocol definitions
no formal API schema

Do not introduce Swagger solely to satisfy this skill.

Errors

Use consistent error behavior.

Prefer:

appropriate status/error codes,
stable machine-readable error identifiers where the project supports them,
safe user-facing details,
useful server logs.

Do not expose:

stack traces in production,
SQL internals,
secrets,
filesystem details,
sensitive authentication data.
Logging and Observability

Use the project's existing logging system.

For meaningful operations, include useful structured context such as:

request/action
status
duration
actor/resource identifiers when safe
error category

Never log secrets or unnecessarily sensitive content.

Refactoring

For refactor-only work:

preserve API behavior,
preserve database semantics,
avoid unrelated schema changes,
move code incrementally,
keep domain boundaries clear,
run tests after each meaningful extraction where practical.

Prefer modularization over full rewrites.

Performance

Before changing architecture:

identify the actual bottleneck,
inspect database queries,
inspect network/API behavior,
measure,
optimize the narrow problem.

Do not add Redis, queues, caching infrastructure, replicas, or a new database solely because the application may grow in the future.

Multitenancy

Only apply tenant-isolation rules when the application is actually multi-tenant.

If multitenancy exists:

derive tenant context from authenticated/authorized state,
validate resource membership,
scope all tenant-owned queries,
do not trust a client-provided tenant identifier by itself,
test cross-tenant access explicitly.

For single-tenant systems, do not introduce tenant abstractions unnecessarily.

Completion Criteria

A backend task is complete when, where applicable:

the API/operation is implemented,
the implementation follows existing architecture,
input validation exists,
authentication is correct,
authorization/ownership is enforced,
database operations are correctly scoped,
atomic operations use transactions,
errors are mapped consistently,
schema changes have migrations,
API documentation/contracts are updated when the project maintains them,
focused tests exist,
relevant checks and smoke/build validation pass.

If a criterion does not apply to the project, do not add infrastructure merely to satisfy the checklist.
