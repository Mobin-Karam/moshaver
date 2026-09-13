# AI repository operating system

Moshaver's AI-facing repository structure is designed to let different coding assistants follow the same engineering rules.

## Layers

1. `AGENTS.md` — canonical global contract.
2. Cross-assistant entrypoints (`AGENT.md`, `CLAUDE.md`, `GEMINI.md`, Copilot instructions) — redirect tools to the same contract.
3. `.agents/skills/` — assistant-neutral reusable skills.
4. `.github/instructions/` — scoped engineering rules.
5. `.github/prompts/` — repeatable workflows for common repository tasks.
6. `.github/agents/` — specialist roles already used by Moshaver.
7. `.github/ai-toolkit/` — portable project detection, validation, and safety utilities.
8. GitHub Actions — executable quality gates.
9. Graphify — first-pass architecture/dependency/change-impact context.

## Rule against duplicate truth

Cross-assistant files should remain small pointers. Deep architecture rules belong in canonical docs/instructions rather than being copied into every assistant-specific file.

## Maintenance

When repository architecture changes, update in this order:

- source/tests;
- canonical architecture docs;
- `AGENTS.md` if operating rules changed;
- scoped instructions/prompts;
- Graphify graph;
- assistant entrypoints only when integration behavior changed.
