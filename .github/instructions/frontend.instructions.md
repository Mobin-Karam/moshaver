---
description: Rules for Next.js and React frontend implementation.
applyTo: "cloud-frontend/**/*.{ts,tsx,js,jsx,css,json}"
---

# Frontend Engineering Rules

The frontend uses technologies such as:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- TanStack React Query
- Zustand
- React Hook Form
- Zod
- Sonner
- Lucide React

Verify the installed packages before relying on them.

## Architecture

Follow the existing separation between:

- Routes and pages
- Layouts
- Feature components
- Shared UI components
- Hooks
- API clients
- Schemas and types
- State stores
- Translation resources

Do not place API logic directly inside large UI components.

## UI requirements

Every feature must consider:

- Loading state
- Empty state
- Error state
- Disabled state
- Mobile state
- Desktop state
- Light mode
- Dark mode
- RTL
- LTR
- Keyboard navigation
- Accessible labels

## Forms

Use:

- React Hook Form for form state
- Zod for validation
- Existing reusable input components
- Friendly API error mapping

Prevent duplicate submission.

## Data access

Use the existing API client and React Query conventions.

After mutations:

- Invalidate the correct query keys.
- Avoid invalidating unrelated data.
- Handle optimistic updates only when safe.