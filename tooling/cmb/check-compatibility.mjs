#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "tooling/cmb/compatibility.json"), "utf8"));
const workspace = JSON.parse(fs.readFileSync(path.join(root, "tooling/workspace/projects.json"), "utf8"));
const errors = [];
const packages = workspace.projects.filter((project) => project.path.startsWith("packages/cmb/"));

for (const project of packages) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, project.path, "package.json"), "utf8"));
  if (!manifest.version.startsWith(`${policy.supportedLine}.`)) errors.push(`${manifest.name}: ${manifest.version} is outside supported line ${policy.supportedLine}.x`);
  if (!manifest.private) errors.push(`${manifest.name}: publication requires a separately reviewed release change`);
  if (!manifest.exports?.["."] || !manifest.types) errors.push(`${manifest.name}: public root export/types are incomplete`);
  if (Object.keys(manifest.exports).some((entry) => entry !== ".")) errors.push(`${manifest.name}: private implementation path is exported`);
}

for (const consumerId of policy.consumers) {
  const project = workspace.projects.find((candidate) => candidate.id === consumerId);
  if (!project) { errors.push(`missing declared consumer: ${consumerId}`); continue; }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, project.path, "package.json"), "utf8"));
  for (const [name, value] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith("@moshaver/cmb-") && !String(value).startsWith("file:")) errors.push(`${consumerId}: ${name} must use the current local compatibility line`);
  }
}

if (errors.length) {
  console.error("CMB compatibility check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`CMB compatibility OK: ${packages.length} private packages on ${policy.supportedLine}.x, ${policy.releaseModel}.`);
