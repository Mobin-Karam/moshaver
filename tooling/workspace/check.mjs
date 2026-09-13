import path from "node:path";
import {
  declaredDependencies,
  loadGraph,
  loadManifest,
  pathExists,
  repoRoot,
  topologicalProjects,
} from "./lib.mjs";

const graph = await loadGraph();
const errors = [];
const ids = new Set();
const paths = new Set();
const packages = new Map();

for (const project of graph.projects) {
  if (!project.id || ids.has(project.id)) errors.push(`Duplicate or missing project id: ${project.id}`);
  ids.add(project.id);

  if (!project.path || paths.has(project.path)) errors.push(`Duplicate or missing project path: ${project.path}`);
  paths.add(project.path);

  const packagePath = path.join(repoRoot, project.path, "package.json");
  if (!(await pathExists(packagePath))) {
    errors.push(`${project.id}: missing ${project.path}/package.json`);
    continue;
  }

  const manifest = await loadManifest(project);
  if (manifest.name !== project.packageName) {
    errors.push(`${project.id}: package name mismatch (${manifest.name} != ${project.packageName})`);
  }
  packages.set(project.packageName, project.id);

  for (const task of project.verifyTasks || []) {
    if (!manifest.scripts?.[task]) errors.push(`${project.id}: verify task "${task}" is not defined in package.json`);
  }

  if (project.bootstrapBuild && !manifest.scripts?.build) {
    errors.push(`${project.id}: bootstrapBuild requires a build script`);
  }

  if (project.install !== false && !(await pathExists(path.join(repoRoot, project.path, "package-lock.json")))) {
    errors.push(`${project.id}: leaf-lockfile install mode requires ${project.path}/package-lock.json`);
  }
}

for (const project of graph.projects) {
  for (const dependencyId of project.dependsOn || []) {
    if (!ids.has(dependencyId)) errors.push(`${project.id}: unknown dependency "${dependencyId}"`);
  }
}

try {
  topologicalProjects(graph);
} catch (error) {
  errors.push(error.message);
}

for (const project of graph.projects) {
  const manifest = await loadManifest(project);
  const declared = declaredDependencies(manifest);
  const expectedLocal = new Set(project.dependsOn || []);

  for (const [packageName, dependencyProjectId] of packages.entries()) {
    if (dependencyProjectId === project.id) continue;
    if (declared[packageName] && !expectedLocal.has(dependencyProjectId)) {
      errors.push(`${project.id}: declares local package ${packageName} but workspace graph is missing ${dependencyProjectId}`);
    }
  }

  for (const dependencyProjectId of expectedLocal) {
    const dependencyProject = graph.projects.find((item) => item.id === dependencyProjectId);
    if (dependencyProject?.packageName && !declared[dependencyProject.packageName]) {
      errors.push(`${project.id}: graph depends on ${dependencyProjectId} but package.json does not declare ${dependencyProject.packageName}`);
    }
  }
}

if (errors.length) {
  console.error("Workspace foundation check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Workspace foundation OK: ${graph.projects.length} projects, leaf-lockfile install model, acyclic dependency graph.`);
