# Feature and bug playbook

Use this workflow for features, workflow improvements, and defects. Visible UI without a secure backend contract is incomplete, and an endpoint without a usable consumer is not a finished product feature.

## Feature workflow

1. Define who needs the outcome, what they must accomplish, the data scope, roles, capabilities, and observable success.
2. Audit routes, API calls, controllers, services, entities, migrations, permissions, scope, UI states, consumers, and tests.
3. Prefer an existing v2 endpoint. For a new contract, define validation, errors, capability, ownership, pagination/filter/sort semantics, and compatibility.
4. Implement vertically: data/migration, service authorization, controller/DTO, backend tests, frontend adapter/types, role-aware UI, component tests, HTTP/browser smoke, and docs.
5. Verify authorized read/write, read-only UX, backend `403`, organization/student isolation, and archived/disabled lifecycle behavior.

Never weaken a guard to make a frontend request succeed. Search current source rather than treating a historical parity document as live truth.

### Admin directory convention

Reuse `admin-v2/src/shared/ui/admin-data-table.tsx`. Selection is controlled by the feature so it can supply only authorized batch actions. “Select all” applies to rows provided to the component; the owner decides whether those rows are one page or all filtered results.

## Bug workflow

1. Capture the symptom, route, role, request, and environment.
2. Reproduce with the smallest reliable test or command.
3. Trace the first incorrect state, not merely the final error.
4. Classify it as contract, authorization, validation, data, state, rendering, configuration, or deployment.
5. Add a regression test that fails for the original reason.
6. Fix the root cause without unrelated cleanup.
7. Run focused and package-level checks, then repeat the reproduction.
8. Document recovery or operational consequences.

## UI checklist

- One page title; the Admin layout owns it.
- Primary actions are visible and permission-gated.
- Search/filter controls report results and can be reset.
- Lists preserve context while opening detail or editor workspaces.
- Batch operations state their scope and confirm destructive changes.
- Progress is scoped to the affected record when possible.
- Forms preserve recoverable input and expose validation clearly.
- Empty states offer create, reset, context, or retry actions.
- Color is not the only status signal.
- Controls have accessible names, visible focus, and comfortable targets.

## Review checklist

- No secrets, databases, build output, or accidental generated files.
- No unrelated user changes reverted or reformatted.
- Endpoint consumers and compatibility aliases inspected.
- Capability names match backend permissions.
- Existing-row and rollback compatibility considered.
- Claimed tests actually ran.
- Browser, native, deployed, Web Push, and destructive-restore evidence are reported separately.

