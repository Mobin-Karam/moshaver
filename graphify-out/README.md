# Graphify output

This directory is reserved for the generated Moshaver knowledge graph.

Generate the initial graph from a supported coding assistant after installing Graphify:

```bash
uv tool install "graphifyy[mcp]"
graphify agents install --project
```

Then invoke the Graphify skill for the repository root. Commit the generated `graph.html`, `GRAPH_REPORT.md`, and `graph.json` when the graph has been reviewed and represents the current repository.

Until `graph.json` exists, agents must fall back to normal repository discovery rather than pretending graph context is available.
