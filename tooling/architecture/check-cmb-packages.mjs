#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const graph = JSON.parse(fs.readFileSync(path.join(root, "tooling/workspace/projects.json"), "utf8"));
const errors = [];
const require = createRequire(import.meta.url);
const cmbProjects = graph.projects.filter((project) => project.path.startsWith("packages/cmb/"));

export function reusableBoundaryViolations(source, declaration = "") {
  return ["apps/api", "apps/student", "student-core", "@nestjs/", "typeorm", "react"].filter(
    (forbidden) => source.includes(forbidden) || declaration.includes(forbidden),
  );
}

for (const project of cmbProjects) {
  const directory = path.join(root, project.path);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  const source = fs.readFileSync(path.join(directory, "src/index.js"), "utf8");
  const declaration = fs.readFileSync(path.join(directory, "src/index.d.ts"), "utf8");
  const expectedName = `@moshaver/cmb-${project.id.replace(/^cmb-/, "")}`;
  if (manifest.name !== expectedName) errors.push(`${project.id}: expected package name ${expectedName}`);
  if (!manifest.exports?.["."]) errors.push(`${project.id}: missing public root export`);
  if (!manifest.types || !declaration.trim()) errors.push(`${project.id}: missing public declarations`);
  if (project.kind !== "cmb-kernel") {
    if (!/defineModule\s*\(\s*\{/.test(source)) errors.push(`${project.id}: missing CMB module descriptor`);
    const publicApi = require(path.join(directory, "src/index.js"));
    const descriptor = Object.values(publicApi).find((value) => value && typeof value === "object" && value.id && value.kind && value.version);
    const expectedId = project.id.replace(/^cmb-/, "");
    if (!descriptor || descriptor.id !== expectedId) errors.push(`${project.id}: public module descriptor id must be ${expectedId}`);
    const expectedDependencies = (project.dependsOn || []).map((dependency) => dependency.replace(/^cmb-/, "")).sort();
    const actualDependencies = Array.from(descriptor?.dependencies || []).sort();
    if (JSON.stringify(actualDependencies) !== JSON.stringify(expectedDependencies)) errors.push(`${project.id}: descriptor dependencies do not match workspace graph`);
  }
  for (const forbidden of reusableBoundaryViolations(source, declaration)) errors.push(`${project.id}: reusable public source references ${forbidden}`);
}

if (process.argv.includes("--self-test")) {
  const fixture = fs.readFileSync(path.join(root, "tooling/architecture/fixtures/forbidden-platform-backedge.fixture"), "utf8");
  const violations = reusableBoundaryViolations(fixture);
  if (!violations.includes("apps/api")) errors.push("architecture self-test did not detect the intentional application backedge fixture");
}

if (errors.length) {
  console.error("CMB package contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`CMB package contracts OK: ${cmbProjects.length} packages with public descriptors and no application backedges.`);
if (process.argv.includes("--self-test")) console.log("Architecture self-test OK: intentional forbidden dependency fixture was detected.");
