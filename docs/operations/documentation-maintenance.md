# Documentation maintenance

Documentation is part of the product contract and changes with behavior.

| Content | Directory |
| --- | --- |
| Current topology and boundaries | `docs/architecture/` |
| Current application or API | `docs/components/` |
| Commands, recovery, security, deployment | `docs/operations/` |
| Planned compatibility work and gaps | `docs/migrations/` |
| Product direction and design | `docs/product/` |
| Releases and user-visible changes | `docs/releases/` |
| Dated audits, fixes, snapshots | `docs/history/` |

Historical documents are evidence. Do not rewrite an old audit to look current; add a dated follow-up or update a current canonical document.

## Update triggers

| Change | Update |
| --- | --- |
| Route, app, port, proxy, data ownership | System map and component page |
| Endpoint or response | HTTP API and consumer page |
| Capability or role | Capability matrix and relevant security/component page |
| Migration/parity status | Migration plan and capability matrix |
| Command or environment variable | Runbook and component guide |
| User-visible feature | Changelog or release note |
| Recovery/deployment | Canonical operations guide |

## Rules and checks

- State `v1.4` or `v2` when ambiguous.
- Use repository-relative links and verified commands.
- Separate confirmed behavior, plans, and history.
- Never include secrets, tokens, personal data, or production database contents.
- Prefer one canonical explanation with links over copied paragraphs.
- Report browser, native, deployed, external-delivery, and destructive-restore evidence separately.

```bash
rg -n 'backend/|admin-app/|student-app/' docs
rg -n 'api/v1|api/v2|localhost:[0-9]+' docs
rg -n 'TODO|TBD|UNKNOWN|production ready|complete' docs
git diff --check -- docs
```

Verify relative links, source paths, and package commands. Generated graphs help navigation but current source remains authoritative.

