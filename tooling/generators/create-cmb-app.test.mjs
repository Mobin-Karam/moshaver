import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createCmbApp } from "./create-cmb-app.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exec = promisify(execFile);

test("generates a runnable CMB service and refuses overwrite", async () => {
  const temporaryRoot = await mkdtemp(path.join(repoRoot, ".cmb-generator-"));
  const target = path.join(temporaryRoot, "sample");
  try {
    await createCmbApp({ target, name: "sample-cmb-service" });
    const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
    assert.equal(manifest.name, "sample-cmb-service");
    assert.match(manifest.dependencies["@moshaver/cmb-kernel"], /^file:/);
    await exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: target });
    await exec("npm", ["test"], { cwd: target });
    await assert.rejects(createCmbApp({ target, name: "sample-cmb-service" }), /already exists/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("rejects invalid names and targets outside the repository", async () => {
  await assert.rejects(createCmbApp({ target: "../outside", name: "valid-name" }), /inside the repository/);
  await assert.rejects(createCmbApp({ target: "apps/example", name: "Invalid Name" }), /valid unscoped npm package name/);
});
