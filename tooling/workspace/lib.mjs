import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(here, "../..");
export const graphPath = path.join(repoRoot, "tooling/workspace/projects.json");

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadGraph() {
  const graph = await readJson(graphPath);
  if (graph.schemaVersion !== 1 || !Array.isArray(graph.projects)) {
    throw new Error("Unsupported workspace graph schema.");
  }
  return graph;
}

export async function loadManifest(project) {
  return readJson(path.join(repoRoot, project.path, "package.json"));
}

export function projectById(graph) {
  return new Map(graph.projects.map((project) => [project.id, project]));
}

export function topologicalProjects(graph) {
  const byId = projectById(graph);
  const state = new Map();
  const ordered = [];

  const visit = (id, stack = []) => {
    const project = byId.get(id);
    if (!project) throw new Error(`Unknown workspace project: ${id}`);

    const current = state.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      throw new Error(`Workspace dependency cycle: ${[...stack, id].join(" -> ")}`);
    }

    state.set(id, "visiting");
    for (const dependencyId of project.dependsOn || []) {
      visit(dependencyId, [...stack, id]);
    }
    state.set(id, "done");
    ordered.push(project);
  };

  for (const project of graph.projects) visit(project.id);
  return ordered;
}

export function dependencyClosure(graph, targetId) {
  const byId = projectById(graph);
  const selected = new Set();

  const collect = (id) => {
    if (selected.has(id)) return;
    const project = byId.get(id);
    if (!project) throw new Error(`Unknown workspace project: ${id}`);
    selected.add(id);
    for (const dependencyId of project.dependsOn || []) collect(dependencyId);
  };

  collect(targetId);
  return selected;
}

export function declaredDependencies(manifest) {
  return {
    ...(manifest.dependencies || {}),
    ...(manifest.devDependencies || {}),
    ...(manifest.peerDependencies || {}),
    ...(manifest.optionalDependencies || {}),
  };
}
