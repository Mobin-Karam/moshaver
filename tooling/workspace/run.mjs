import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  dependencyClosure,
  loadGraph,
  loadManifest,
  repoRoot,
  topologicalProjects,
} from "./lib.mjs";

const graph = await loadGraph();
const ordered = topologicalProjects(graph);
const args = process.argv.slice(2);
const command = args[0] || "help";
const dryRun = args.includes("--dry-run");
const projectArg = args.find((arg) => arg.startsWith("--project="));
const projectId = projectArg ? projectArg.slice("--project=".length) : null;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const selectedIds = projectId ? dependencyClosure(graph, projectId) : new Set(ordered.map((project) => project.id));
const selected = ordered.filter((project) => selectedIds.has(project.id));

function exec(project, npmArgs) {
  const cwd = path.join(repoRoot, project.path);
  console.log(`\n[workspace] ${project.id}: npm ${npmArgs.join(" ")}`);
  if (dryRun) return;

  const result = spawnSync(npmCommand, npmArgs, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function runTask(task) {
  for (const project of selected) {
    const manifest = await loadManifest(project);
    if (!manifest.scripts?.[task]) continue;
    exec(project, ["run", task]);
  }
}

async function verify() {
  for (const project of selected) {
    const manifest = await loadManifest(project);
    for (const task of project.verifyTasks || []) {
      if (!manifest.scripts?.[task]) {
        throw new Error(`${project.id}: missing verify task ${task}`);
      }
      exec(project, ["run", task]);
    }
  }
}

async function bootstrap() {
  for (const project of selected) {
    if (project.install !== false) exec(project, ["ci"]);
    if (project.bootstrapBuild) exec(project, ["run", "build"]);
  }
}

function list() {
  for (const project of ordered) {
    const dependencies = (project.dependsOn || []).join(", ") || "none";
    console.log(`${project.id.padEnd(16)} ${project.kind.padEnd(16)} ${project.path.padEnd(24)} depends on: ${dependencies}`);
  }
}

async function plan(task) {
  console.log(`Install model: ${graph.installModel}`);
  console.log(`Order: ${selected.map((project) => project.id).join(" -> ")}`);
  if (!task) return;

  for (const project of selected) {
    const manifest = await loadManifest(project);
    const enabled = Boolean(manifest.scripts?.[task]);
    console.log(`- ${project.id}: ${enabled ? `npm run ${task}` : "skip"}`);
  }
}

try {
  if (command === "list") {
    list();
  } else if (command === "plan") {
    await plan(args[1] && !args[1].startsWith("--") ? args[1] : null);
  } else if (command === "bootstrap") {
    await bootstrap();
  } else if (command === "run") {
    const task = args[1];
    if (!task || task.startsWith("--")) throw new Error("Usage: run.mjs run <task> [--project=<id>] [--dry-run]");
    await runTask(task);
  } else if (command === "verify") {
    await verify();
  } else {
    console.log(`Usage:
  node tooling/workspace/run.mjs list
  node tooling/workspace/run.mjs plan [task] [--project=<id>]
  node tooling/workspace/run.mjs bootstrap [--project=<id>] [--dry-run]
  node tooling/workspace/run.mjs run <task> [--project=<id>] [--dry-run]
  node tooling/workspace/run.mjs verify [--project=<id>] [--dry-run]`);
    if (command !== "help") process.exitCode = 1;
  }
} catch (error) {
  console.error(`[workspace] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
