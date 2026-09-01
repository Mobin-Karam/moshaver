# Admin v2 source structure

- `app/`: application composition, routing, layout, providers, and development-only controls.
- `features/`: product modules. Feature-only models, components, and tests stay with their feature.
- `shared/api/`: backend transport and cross-feature API behavior.
- `shared/hooks/`: hooks used by more than one feature.
- `shared/lib/`: framework-neutral helpers and Persian normalization utilities.
- `shared/types/`: API domain contracts shared across feature boundaries.
- `shared/ui/`: reusable UI, modal, locale, calendar, transfer, and notification primitives.
- `styles/`: application-level CSS and font declarations.
- `test/`: global test environment configuration.

Features may depend on `shared/` and `app/` may compose both. Shared modules must not import feature modules. Feature-specific code should not be moved into `shared/` merely to shorten an import.
