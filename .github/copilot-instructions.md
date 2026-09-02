# Repository-wide Copilot instructions

- Discover the project before editing. Do not assume languages, frameworks, package managers, app folders, database engines, or deployment targets.
- Read the nearest `AGENTS.md` and applicable `.github/instructions/*.instructions.md` files.
- Prefer existing repository conventions and dependencies. Avoid unnecessary rewrites or new packages.
- Search for callers, consumers, tests, types, schemas, routes, and configuration before changing a shared contract.
- Keep changes focused, reversible, and compatible unless the user explicitly asks for a breaking change.
- Never expose, print, commit, or fabricate secrets. Treat `.env*`, credentials, private keys, tokens, and production data as sensitive.
- Do not disable security controls to fix functionality.
- Do not execute destructive Git, filesystem, database, or deployment operations unless explicitly required and safe.
- For bugs: reproduce or trace the failure, identify the root cause, implement the smallest fix, and add a regression test when practical.
- For database changes: inspect current schema, migrations, constraints, indexes, consumers, and rollout safety.
- For UI changes: preserve the design system and consider loading, empty, error, disabled, accessibility, responsive, keyboard, theme, and localization states when applicable.
- For API changes: verify the real request/response/error/authentication contract and identify affected consumers.
- Use project-defined lint, test, typecheck, format, and build commands. Never report a check as passing unless it actually ran successfully.
- Reference concrete file paths when explaining repository-specific findings.
- Mark unresolved repository facts as `UNKNOWN` instead of inventing them.
