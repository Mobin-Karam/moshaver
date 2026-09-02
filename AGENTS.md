# AI Engineering Guide

This repository uses a portable AI engineering toolkit under `.github/`.

## First actions

Before making changes:

1. Inspect the repository structure and relevant manifests.
2. Read `.github/copilot-instructions.md`.
3. Run `.github/ai-toolkit/scripts/detect-project.sh` when a shell is available.
4. Read `.agent-state/project.json` if it exists.
5. Inspect existing tests, build scripts, conventions, and nearby code before editing.

## Engineering rules

- Treat the repository as the source of truth; do not assume a framework or directory layout.
- Prefer existing libraries, patterns, components, and commands over introducing new ones.
- Make the smallest complete change that satisfies the request.
- Preserve public contracts unless a breaking change is explicitly required.
- Never weaken authentication, authorization, validation, tenant isolation, or secret handling to make code pass.
- Never claim tests/builds passed unless they were actually run successfully.
- For bugs, find the root cause and add a regression test when practical.
- For database changes, inspect migration history and data compatibility before editing schemas.
- For UI work, handle loading, empty, error, disabled, responsive, keyboard, and accessibility states where relevant.
- For API changes, identify all known consumers and synchronize contract changes.

## Validation

Use project-defined commands first. The generic fallback is:

```bash
.github/ai-toolkit/scripts/validate-project.sh quick
```

For release-quality validation:

```bash
.github/ai-toolkit/scripts/validate-project.sh full
```

If a command cannot be run because the environment or dependencies are unavailable, report that limitation rather than guessing.
