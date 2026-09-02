# Moshaver Version Roadmap

## v1.4.0 — Admin Control & Exam Delivery — built

- Stable Admin login/reload/logout synchronization.
- Full day/week/month plan control.
- JSON schema v2 for plans + exams + syllabus + exam questions.
- Selected-student-safe imports.
- Timed one-attempt exams with resume and Advisor-approved retry.
- Better Student/Admin chat and notification UX.
- Custom toast/feedback and SVG additions.
- Regression coverage for critical Admin controls and exam lifecycle.

## v1.4.x — Stability only

- Real-device Android regression fixes.
- Accessibility/keyboard/focus refinements.
- SSE reconnect/replay edge cases.
- Offline queue edge cases.
- Import diagnostics and backup/restore UX.
- No major schema/architecture rewrite unless a production defect requires it.

## v1.5.0 — Advisor Intelligence

- Explainable exam-readiness model.
- Weakness/mistake trends.
- Review debt and study consistency.
- Fatigue/workload trends.
- Proposed tomorrow-plan adjustments requiring Advisor approval.
- Weekly Advisor summary.

## v1.6.0 — Multi-student workflow

- Advisor/student assignment model.
- Bulk templates and plan operations.
- Advisor workload views.
- Student onboarding/invitation.

## v1.7.0 — SaaS foundation

- Organizations/memberships and explicit tenant isolation.
- RBAC and stronger audit/retention controls.
- Subscription/onboarding foundation.

## v2.0.0 — Scale-driven platform migration

- Monorepo + TypeScript.
- Student: Preact + Vite PWA.
- Admin: React + Vite.
- API: NestJS + Fastify modular monolith.
- PostgreSQL primary database.
- Redis for cache/presence/SSE fan-out.
- BullMQ workers.
- S3-compatible object storage.
- OpenTelemetry.

Microservices remain optional and should only be introduced for genuine independent scaling/failure domains.
