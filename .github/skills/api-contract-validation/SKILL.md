---
name: api-contract-validation
description: Trace and validate API contracts across backend, web frontend, and mobile. Use when implementing endpoints, fixing 404/400/401/403/500 errors, updating DTOs, or synchronizing clients.
---

# API Contract Validation Skill

Trace the complete relationship:

Frontend or Mobile Screen
→ Hook
→ API Client
→ HTTP Request
→ Backend Controller
→ DTO
→ Guard
→ Service
→ Prisma Model
→ Response
→ Client Type

For every problem, document:

- Client file
- API client file
- HTTP method
- Expected route
- Actual backend route
- Request body
- Response shape
- Authentication method
- Required permission
- Related database models

Never repair a client error by inventing a route without checking the backend.