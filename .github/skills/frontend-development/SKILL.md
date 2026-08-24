---
name: frontend-development
description: Implement, repair, refactor, optimize, and validate frontend features across web projects. Use for routes, pages, layouts, components, forms, state management, API integration, authentication UI, authorization-aware navigation, responsive UI, accessibility, themes, i18n, RTL/LTR, PWAs, and frontend performance. Adapt to the project's existing framework and architecture instead of assuming React, Next.js, or any specific library.
---

# Frontend Development Skill

## Core Principle

Inspect the project before choosing implementation patterns.

Do not assume the frontend uses React, Next.js, Vue, Svelte, TypeScript, a bundler, a component framework, or any particular state/form library.

Prefer the project's existing stack, conventions, dependencies, and design system.

Do not introduce a new framework or major dependency unless:

- the user explicitly requests it,
- the existing project already uses it,
- or there is a clear technical requirement that cannot reasonably be met with the current architecture.

## Architecture Discovery

Before editing, determine where applicable:

- Framework or vanilla implementation
- Language: JavaScript, TypeScript, or other
- Build system or static delivery
- Application entry points
- Router/navigation model
- Routes/pages/screens
- Layout hierarchy
- Component conventions
- State management approach
- API client
- Authentication/session model
- Authorization/permission model
- Form and validation approach
- Styling architecture
- Design tokens/design system
- Localization/i18n approach
- RTL/LTR requirements
- Theme support
- PWA/service-worker behavior
- Testing tools
- Supported browsers/devices

Do not require concepts that the project does not use.

For example, query keys, React hooks, layouts, or response interfaces should only be inspected when relevant to the detected architecture.

## Workflow

1. Read the requested feature, bug, refactor, or UI change.

2. Inspect the frontend architecture and relevant project instructions.

3. Locate the smallest relevant set of:
   - routes/pages/views,
   - components,
   - state,
   - API calls,
   - styles,
   - tests.

4. Find and verify the backend contract used by the feature.

5. Inspect existing UI and design-system conventions.

6. Identify authentication, authorization, localization, accessibility, and responsive requirements.

7. Create a focused implementation plan.

8. Implement the smallest complete change while preserving existing architecture.

9. Add applicable states:
   - loading,
   - empty,
   - error,
   - retry,
   - disabled,
   - unauthorized/forbidden,
   - offline where relevant.

10. Validate relevant viewports, themes, text directions, browsers, and interaction states.

11. Run the project's available lint, type, test, build, or static validation commands.

12. Inspect the result in a browser or representative viewport for visible UI changes when tooling is available.

13. Report:
   - changed files,
   - important decisions,
   - validation performed,
   - remaining risks.

## API Integration

Before changing API-dependent UI, identify:

- HTTP method
- Endpoint
- Authentication mechanism
- CSRF requirements if applicable
- Request body/query/path parameters
- Response shape
- Error responses
- Pagination behavior
- Realtime behavior if applicable

Use the real backend contract.

Do not invent mock response fields in production code unless the task explicitly requests a mock.

Keep client and server expectations synchronized.

## Forms

Follow the project's existing form and validation approach.

If the project already uses a form library or schema validator, use it consistently.

Do not introduce React Hook Form, Zod, Yup, Formik, or another library solely because this skill mentions forms.

Every important form should consider:

- client-side validation where useful,
- server-side validation errors,
- duplicate submission prevention,
- disabled/pending state,
- preservation of user-entered values,
- translated messages where localization exists,
- accessible labels and error associations.

Do not silently transform user-entered values unless normalization is explicitly required by the domain.

## State Management

Use the simplest state model appropriate for the existing application.

Possible valid approaches include:

- local DOM state,
- component state,
- context,
- application stores,
- URL state,
- server-state/query libraries,
- small project-local modules.

Do not introduce a global state manager for state that can remain local.

## Rendering and Components

Prefer reusable components for repeated behavior, but avoid unnecessary abstraction.

Extract a component/module when it:

- appears in multiple places,
- contains meaningful interaction logic,
- has a stable reusable UI contract,
- or materially improves maintainability.

Do not turn every small element into its own component.

For vanilla JavaScript applications, prefer small modules and explicit DOM event registration over increasingly large monolithic scripts.

## Responsive and Mobile Web

Where applicable, validate:

- narrow phone widths,
- larger phones,
- tablets,
- desktop,
- orientation changes,
- long translated text,
- touch interaction,
- safe areas for installed PWAs,
- software keyboard interaction.

Avoid unnecessary JavaScript and large dependencies when targeting low-end devices.

Prefer:

- progressive enhancement,
- native browser APIs,
- lazy loading,
- code splitting where supported,
- pagination/windowing for large datasets,
- optimized assets,
- minimal startup work.

## Accessibility

For visible UI changes, consider:

- semantic HTML,
- keyboard navigation,
- focus management,
- labels,
- accessible names,
- modal focus behavior,
- contrast,
- reduced-motion preferences,
- screen-reader status/error feedback.

Preserve existing accessibility conventions and improve obvious regressions when within task scope.

## RTL, LTR, i18n, and Themes

When the application supports them, validate:

- RTL layout
- LTR layout
- translated labels
- number/date formatting
- text expansion
- light theme
- dark theme

Avoid direction-specific layout hacks where logical CSS properties can be used.

## Authentication and Authorization UI

Frontend permission checks improve UX but do not replace backend authorization.

Verify where relevant:

- unauthenticated state,
- session expiration,
- logout,
- protected routes,
- hidden/disabled actions,
- role or permission-based navigation,
- forbidden API responses.

Never treat hiding a button as sufficient authorization.

## Realtime UI

If the project uses SSE, WebSockets, polling, subscriptions, or another realtime mechanism:

- follow the existing transport,
- handle reconnect behavior,
- prevent duplicate events,
- preserve ordering where necessary,
- update only affected UI,
- avoid unnecessary full-page reloads.

Do not migrate realtime technologies without a concrete requirement.

## PWA and Service Workers

When applicable, consider:

- cached asset updates,
- stale client versions,
- offline behavior,
- installation behavior,
- service-worker cache invalidation,
- API caching safety.

Do not cache authenticated or sensitive API responses unless the project's security model explicitly supports it.

## Refactoring

For refactor-only tasks:

- preserve behavior,
- avoid unrelated redesigns,
- split by domain or responsibility,
- reduce duplication carefully,
- keep commits/changes conceptually narrow,
- validate before and after behavior.

Prefer incremental extraction over frontend rewrites.

## Completion Criteria

A frontend task is complete when, where applicable:

- the real backend/API contract is used,
- the implementation follows the project's architecture,
- loading/error/empty states are handled,
- authorization-aware behavior is correct,
- forms prevent accidental duplicate actions,
- responsive behavior is validated,
- RTL/LTR and themes are validated when supported,
- accessibility has been considered,
- relevant automated checks pass,
- visible changes have been browser-validated when possible.

If a criterion does not apply to the project, do not invent infrastructure solely to satisfy it.