#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [id, dependencyList = ""] = process.argv.slice(2);
const validId = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
if (!validId.test(id || "")) {
  console.error("Usage: npm run generate:product -- <id> [comma-separated-local-package-names]");
  process.exit(1);
}
const dependencies = [...new Set(dependencyList.split(",").map((value) => value.trim()).filter(Boolean))];
if (dependencies.some((value) => !/^@moshaver\/(?:cmb-|api-contract|product-)[a-z0-9-]+$/.test(value))) throw new Error("Product dependencies must be public @moshaver package names.");
const root = process.cwd();
const directory = path.join(root, "packages", "product", id);
if (fs.existsSync(directory)) throw new Error(`Refusing to overwrite existing path: packages/product/${id}`);
const constant = `${id.replace(/-/g, "_").toUpperCase()}_PRODUCT`;
const manifest = { name: `@moshaver/product-${id}`, version: "0.1.0", private: true, type: "commonjs", main: "src/index.js", types: "src/index.d.ts", exports: { ".": { types: "./src/index.d.ts", require: "./src/index.js", default: "./src/index.js" } }, scripts: { test: "node --test tests/*.test.js" }, engines: { node: ">=22.5.0 <23" }, dependencies: Object.fromEntries(dependencies.map((name) => [name, "workspace-contract-required"])) };
const files = {
  "package.json": `${JSON.stringify(manifest, null, 2)}\n`,
  "src/index.js": `"use strict";\nconst ${constant} = Object.freeze({ id: "${id}", version: "0.1.0", kind: "product" });\nmodule.exports = { ${constant} };\n`,
  "src/index.d.ts": `export const ${constant}: Readonly<{ id: "${id}"; version: string; kind: "product" }>;\n`,
  "tests/product.test.js": `"use strict";\nconst test = require("node:test");\nconst assert = require("node:assert/strict");\nconst { ${constant} } = require("../src");\ntest("declares ${id} product ownership", () => assert.equal(${constant}.kind, "product"));\n`,
  "README.md": `# \`@moshaver/product-${id}\`\n\nDocument domain ownership, public use cases, persistence ownership, consumers, and retained application adapters before adding implementation.\n`,
};
for (const [relative, content] of Object.entries(files)) { const target = path.join(directory, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
console.log(`Created packages/product/${id}. Replace dependency placeholders with explicit file paths, add the project DAG node, and document real consumers before implementation.`);
