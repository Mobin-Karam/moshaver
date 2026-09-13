# Graphify in Moshaver

Moshaver uses Graphify as a code knowledge graph to reduce repeated full-repository reading by humans and AI agents.

## Purpose

Use Graphify for:

- locating architecture and ownership;
- tracing callers/callees and dependency paths;
- identifying cross-application API consumers;
- estimating change impact before edits;
- understanding CMB module boundaries;
- reviewing high-coupling areas and pull requests.

The graph is **navigation evidence**, not the ultimate source of truth. Current source, migrations, contracts, and executed tests win when they disagree with the graph.

## Local setup

Requirements: Python 3.10+ and a supported coding assistant.

```bash
uv tool install "graphifyy[mcp]"
graphify agents install --project
```

You can instead install the project skill for a specific assistant, such as Claude, Codex, Gemini, or Copilot.

Build the graph from inside a supported assistant using its Graphify skill. The standard output is under `graphify-out/` and includes the interactive graph, report, and machine-readable graph.

## Agent workflow

1. Query the graph.
2. Narrow to relevant nodes/files.
3. Inspect actual source.
4. Make the change.
5. Run component validation.
6. Refresh Graphify after material architecture/module/contract changes.

## MCP

The repository includes `.mcp.json`, which points a compatible MCP client at the local `graphify-out/graph.json` through the Graphify server. Install Graphify with MCP support before using that configuration.

## Freshness

Refresh after:

- major pulls/merges;
- module moves/renames;
- API contract changes;
- new migrations/entities;
- architecture refactors;
- significant changes to CMB boundaries.

If a graph appears to reference legacy v1 paths or contradict current code, treat it as stale and refresh before relying on it.
