#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [id, kind = "platform", dependencyList = "kernel"] = process.argv.slice(2);
const validId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const validKinds = new Set(["foundation", "platform", "adapter"]);
if (!validId.test(id || "") || !validKinds.has(kind)) {
  console.error("Usage: npm run generate:cmb -- <id> [foundation|platform|adapter] [comma-separated-dependencies]");
  process.exit(1);
}
const dependencies = [...new Set(dependencyList.split(",").map((value) => value.trim()).filter(Boolean))];
if (dependencies.includes(id) || dependencies.some((value) => !validId.test(value))) throw new Error("Invalid CMB dependency list.");
const root = process.cwd();
const directory = path.join(root, "packages", "cmb", id);
if (fs.existsSync(directory)) throw new Error(`Refusing to overwrite existing path: packages/cmb/${id}`);
const constant = `${id.replace(/-/g, "_").toUpperCase()}_MODULE`;
const localDependencies = Object.fromEntries(dependencies.map((dependency) => [`@moshaver/cmb-${dependency}`, `file:../${dependency}`]));
const manifest = { name: `@moshaver/cmb-${id}`, version: "0.1.0", private: true, type: "commonjs", main: "src/index.js", types: "src/index.d.ts", exports: { ".": { types: "./src/index.d.ts", require: "./src/index.js", default: "./src/index.js" } }, scripts: { test: "node --test tests/*.test.js" }, engines: { node: ">=22.5.0 <23" }, dependencies: localDependencies };
const files = {
  "package.json": `${JSON.stringify(manifest, null, 2)}\n`,
  "src/index.js": `"use strict";\nconst { defineModule } = require("@moshaver/cmb-kernel");\nconst ${constant} = defineModule({ id: "${id}", version: "0.1.0", kind: "${kind}", dependencies: ${JSON.stringify(dependencies)} });\nmodule.exports = { ${constant} };\n`,
  "src/index.d.ts": `export const ${constant}: Readonly<{ id: "${id}"; version: string; kind: "${kind}"; dependencies: readonly string[] }>;\n`,
  "tests/module.test.js": `"use strict";\nconst test = require("node:test");\nconst assert = require("node:assert/strict");\nconst { ${constant} } = require("../src");\ntest("declares ${id} module", () => assert.equal(${constant}.id, "${id}"));\n`,
  "README.md": `# \`@moshaver/cmb-${id}\`\n\nDescribe the reusable ownership boundary and retained application adapters here.\n`,
};
for (const [relative, content] of Object.entries(files)) { const target = path.join(directory, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
console.log(`Created packages/cmb/${id}. Add it to tooling/workspace/projects.json, run npm install in the package, and declare each real consumer edge.`);
