#!/usr/bin/env node

import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const referenceRoot = path.join(repoRoot, "apps/cmb-reference");

export async function createCmbApp({ target, name }) {
  if (!target) throw new TypeError("--target is required.");
  const packageName = String(name ?? path.basename(target)).trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName)) throw new TypeError("--name must be a valid unscoped npm package name.");

  const targetPath = path.resolve(repoRoot, target);
  const relativeTarget = path.relative(repoRoot, targetPath);
  if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error("Target must be a new directory inside the repository.");
  }
  try {
    await stat(targetPath);
    throw new Error(`Target already exists: ${relativeTarget}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await mkdir(targetPath, { recursive: true });
  for (const entry of ["src", "tests", "README.md"]) {
    await cp(path.join(referenceRoot, entry), path.join(targetPath, entry), { recursive: true });
  }

  const manifest = JSON.parse(await readFile(path.join(referenceRoot, "package.json"), "utf8"));
  manifest.name = packageName;
  const dependencyPaths = Object.fromEntries(
    Object.keys(manifest.dependencies)
      .filter((dependency) => dependency.startsWith("@moshaver/cmb-"))
      .map((dependency) => [dependency, path.join(repoRoot, "packages/cmb", dependency.slice("@moshaver/cmb-".length))]),
  );
  for (const [dependency, dependencyPath] of Object.entries(dependencyPaths)) {
    const relative = path.relative(targetPath, dependencyPath).split(path.sep).join("/");
    manifest.dependencies[dependency] = `file:${relative.startsWith(".") ? relative : `./${relative}`}`;
  }
  await writeFile(path.join(targetPath, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return targetPath;
}

function parseArguments(arguments_) {
  const values = {};
  for (const argument of arguments_) {
    const match = argument.match(/^--(target|name)=(.+)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createCmbApp(parseArguments(process.argv.slice(2)))
    .then((targetPath) => process.stdout.write(`Created CMB app at ${path.relative(repoRoot, targetPath)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
