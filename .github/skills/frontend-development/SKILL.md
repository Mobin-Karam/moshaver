---
name: frontend-development
description: Implement, repair, refactor, and validate Next.js and React frontend features. Use for routes, layouts, components, forms, React Query, Zustand, authentication UI, RBAC navigation, responsive UI, dark mode, and i18n.
---

# Frontend Development Skill

## Workflow

1. Read the requested feature or bug.
2. Locate the relevant routes, pages, layouts, components, hooks, and API clients.
3. Find the backend endpoints used by the feature.
4. Inspect existing component and design-system conventions.
5. Create an implementation plan.
6. Implement the smallest complete change.
7. Add loading, empty, error, and permission states.
8. Validate mobile, desktop, RTL, LTR, light, and dark modes when applicable.
9. Run lint, type checking, tests, and build validation.
10. Report changed files and remaining risks.

## Required analysis

Before editing, identify:

- Route
- Layout
- Page
- Components
- Hooks
- Query keys
- API client
- Request schema
- Response types
- Required permissions
- Translation keys

## Form requirements

For forms:

- Use React Hook Form.
- Use Zod validation.
- Disable duplicate submission.
- Preserve server error details through friendly messages.
- Keep validation messages translated.
- Do not submit values that differ from what the user entered unless normalization is explicitly required.

## Completion criteria

A frontend task is complete only when:

- The UI uses the real API.
- Types match the API response.
- Loading and error states exist.
- Permission handling exists.
- Responsive layout is validated.
- Relevant checks pass.