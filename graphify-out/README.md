# Graphify output

This directory is reserved for the generated Moshaver knowledge graph.

## Current status

At the Phase-1 source inventory baseline (`develop` commit `e6185d391030bb012aad8404bd61b5b91ab964ab`), a current `graphify-out/graph.json` is **not committed**.

Source-backed architecture evidence is available in `docs/architecture/inventory/`. It must not be presented as Graphify-generated output.

## Generate the graph

Install Graphify in a supported local coding-assistant environment:

```bash
uv tool install "graphifyy[mcp]"
graphify agents install --project
```

Then invoke the Graphify project skill for the repository root and review the generated graph before relying on it.

Commit generated `graph.html`, `GRAPH_REPORT.md`, and `graph.json` only after confirming that they represent the current v2 repository and do not primarily reference archived/legacy paths.

## Reconciliation rule

After generating the graph:

1. compare it with `docs/architecture/inventory/backend-v2-module-inventory.json`;
2. verify high-coupling paths in current source;
3. update the inventory when source/graph evidence proves it stale;
4. prefer current source and executable tests when the graph disagrees;
5. refresh Graphify after architecture/module/contract changes.

Until `graph.json` exists, agents must fall back to source discovery rather than pretending Graphify context is available.
