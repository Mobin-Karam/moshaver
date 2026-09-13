#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const auditOnly = process.argv.includes('--audit');
const reportArg = process.argv.find((arg) => arg.startsWith('--report='));
const reportPath = reportArg ? reportArg.slice('--report='.length) : null;
const graph = JSON.parse(fs.readFileSync(path.join(root, 'tooling/workspace/projects.json'), 'utf8'));
const baselinePath = path.join(root, 'tooling/architecture/baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : { schemaVersion: 1, backendDeepImports: [], backendCycles: [] };

const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'build', 'target', '.git', 'graphify-out']);
const projectById = new Map(graph.projects.map((project) => [project.id, project]));
const projects = graph.projects.map((project) => ({
  ...project,
  abs: path.resolve(root, project.path),
}));
const packageProjects = [...projects]
  .filter((project) => project.packageName)
  .sort((a, b) => b.packageName.length - a.packageName.length);

const violations = [];
const crossProjectEdges = new Set();
const backendCrossModuleEdges = new Set();
const backendDeepImports = new Set();
const backendFileGraph = new Map();
const scannedFiles = [];

function posix(value) {
  return value.split(path.sep).join('/');
}

function rel(abs) {
  return posix(path.relative(root, abs));
}

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, output);
    else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name))) output.push(abs);
  }
  return output;
}

function ownerFor(abs) {
  const normalized = path.resolve(abs);
  return projects.find((project) => normalized === project.abs || normalized.startsWith(`${project.abs}${path.sep}`));
}

function parseSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base];
  for (const ext of CODE_EXTS) candidates.push(`${base}${ext}`);
  for (const ext of CODE_EXTS) candidates.push(path.join(base, `index${ext}`));
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || base;
}

function packageTarget(specifier) {
  return packageProjects.find(
    (project) => specifier === project.packageName || specifier.startsWith(`${project.packageName}/`),
  );
}

function addFileEdge(source, target) {
  if (!backendFileGraph.has(source)) backendFileGraph.set(source, new Set());
  backendFileGraph.get(source).add(target);
  if (!backendFileGraph.has(target)) backendFileGraph.set(target, new Set());
}

function backendModule(file) {
  const relative = rel(file);
  const match = relative.match(/^backend-v2\/src\/modules\/([^/]+)\//);
  return match?.[1] || null;
}

function isPublicModuleTarget(file, moduleName) {
  const base = path.basename(file);
  return base === `${moduleName}.module.ts` || base === 'index.ts';
}

function isRuntimeNeutralSource(file) {
  const relative = rel(file);
  return relative.startsWith('student-core/src/') || relative.startsWith('packages/api-contract/src/');
}

function isBannedRuntimeImport(specifier) {
  return (
    specifier === 'react' ||
    specifier.startsWith('react/') ||
    specifier === 'react-dom' ||
    specifier.startsWith('react-dom/') ||
    specifier.startsWith('@tauri-apps/') ||
    specifier.startsWith('@nestjs/') ||
    specifier === 'typeorm' ||
    specifier.startsWith('typeorm/')
  );
}

function cmbBackedge(sourceFile, specifier, targetFile) {
  if (!rel(sourceFile).startsWith('packages/cmb/')) return false;
  const target = targetFile ? rel(targetFile) : '';
  return (
    target.startsWith('backend-v2/src/modules/') ||
    target.startsWith('admin-v2/') ||
    target.startsWith('student-app-v2/') ||
    target.startsWith('student-core/') ||
    target.startsWith('packages/product/') ||
    specifier === '@moshaver/student-core' ||
    specifier.startsWith('@moshaver/student-core/')
  );
}

for (const project of projects) {
  const sourceRoots = [path.join(project.abs, 'src')];
  for (const sourceRoot of sourceRoots) {
    for (const file of walk(sourceRoot)) {
      scannedFiles.push(rel(file));
      const sourceProject = ownerFor(file);
      const sourceText = fs.readFileSync(file, 'utf8');
      for (const specifier of parseSpecifiers(sourceText)) {
        let targetFile = null;
        let targetProject = null;

        if (specifier.startsWith('.')) {
          targetFile = resolveRelative(file, specifier);
          targetProject = ownerFor(targetFile);
        } else {
          targetProject = packageTarget(specifier) || null;
        }

        if (isRuntimeNeutralSource(file) && isBannedRuntimeImport(specifier)) {
          violations.push(`${rel(file)} imports runtime/framework dependency ${specifier}`);
        }

        if (cmbBackedge(file, specifier, targetFile)) {
          violations.push(`${rel(file)} creates CMB -> product/application backedge via ${specifier}`);
        }

        if (targetProject && sourceProject && targetProject.id !== sourceProject.id) {
          const edge = `${sourceProject.id} -> ${targetProject.id}`;
          crossProjectEdges.add(edge);
          const declared = new Set(sourceProject.dependsOn || []);
          if (!declared.has(targetProject.id)) {
            violations.push(`${rel(file)} creates undeclared workspace edge ${edge} via ${specifier}`);
          }
          if (specifier.startsWith('.')) {
            violations.push(`${rel(file)} crosses project boundary by relative import ${specifier}`);
          } else if (specifier !== targetProject.packageName) {
            violations.push(`${rel(file)} deep-imports local package ${specifier}; use ${targetProject.packageName}`);
          }
        }

        if (rel(file).startsWith('backend-v2/src/') && specifier.startsWith('.') && targetFile) {
          const resolved = resolveRelative(file, specifier);
          if (fs.existsSync(resolved) && fs.statSync(resolved).isFile() && rel(resolved).startsWith('backend-v2/src/')) {
            addFileEdge(rel(file), rel(resolved));
            const fromModule = backendModule(file);
            const toModule = backendModule(resolved);
            if (fromModule && toModule && fromModule !== toModule) {
              const edge = `${fromModule} -> ${toModule}: ${rel(file)} -> ${rel(resolved)}`;
              backendCrossModuleEdges.add(edge);
              if (!isPublicModuleTarget(resolved, toModule)) backendDeepImports.add(`${rel(file)} -> ${rel(resolved)}`);
            }
          }
        }
      }
    }
  }
}

// Tarjan strongly connected components over backend file imports.
let index = 0;
const stack = [];
const onStack = new Set();
const indexes = new Map();
const low = new Map();
const cycles = [];

function strongConnect(node) {
  indexes.set(node, index);
  low.set(node, index);
  index += 1;
  stack.push(node);
  onStack.add(node);

  for (const next of backendFileGraph.get(node) || []) {
    if (!indexes.has(next)) {
      strongConnect(next);
      low.set(node, Math.min(low.get(node), low.get(next)));
    } else if (onStack.has(next)) {
      low.set(node, Math.min(low.get(node), indexes.get(next)));
    }
  }

  if (low.get(node) === indexes.get(node)) {
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== node);
    if (component.length > 1) cycles.push(component.sort().join(' <-> '));
  }
}

for (const node of backendFileGraph.keys()) if (!indexes.has(node)) strongConnect(node);

const baselineDeep = new Set(baseline.backendDeepImports || []);
const baselineCycles = new Set(baseline.backendCycles || []);
if (!auditOnly) {
  for (const edge of backendDeepImports) {
    if (!baselineDeep.has(edge)) violations.push(`new backend deep implementation import: ${edge}`);
  }
  for (const cycle of cycles) {
    if (!baselineCycles.has(cycle)) violations.push(`new backend import cycle: ${cycle}`);
  }
}

const report = {
  schemaVersion: 1,
  auditOnly,
  scannedFiles: scannedFiles.length,
  workspaceEdges: [...crossProjectEdges].sort(),
  backendCrossModuleEdges: [...backendCrossModuleEdges].sort(),
  backendDeepImports: [...backendDeepImports].sort(),
  backendCycles: [...cycles].sort(),
  violations: [...new Set(violations)].sort(),
};

if (reportPath) {
  const absoluteReport = path.resolve(root, reportPath);
  fs.mkdirSync(path.dirname(absoluteReport), { recursive: true });
  fs.writeFileSync(absoluteReport, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(`Architecture boundary scan: ${report.scannedFiles} source files`);
console.log(`Workspace edges: ${report.workspaceEdges.length}`);
console.log(`Backend cross-module edges: ${report.backendCrossModuleEdges.length}`);
console.log(`Backend deep implementation imports: ${report.backendDeepImports.length}`);
console.log(`Backend import cycles: ${report.backendCycles.length}`);

if (report.backendDeepImports.length) {
  console.log('\nCurrent backend deep imports:');
  for (const edge of report.backendDeepImports) console.log(`- ${edge}`);
}
if (report.backendCycles.length) {
  console.log('\nCurrent backend cycles:');
  for (const cycle of report.backendCycles) console.log(`- ${cycle}`);
}
if (report.violations.length) {
  console.error('\nArchitecture violations:');
  for (const violation of report.violations) console.error(`- ${violation}`);
  if (!auditOnly) process.exit(1);
  console.log('\nAudit mode: violations reported without failing.');
} else {
  console.log('\nArchitecture boundaries OK.');
}
