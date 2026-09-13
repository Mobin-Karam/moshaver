#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const writeArg = process.argv.find((arg) => arg.startsWith('--write='));
const checkArg = process.argv.find((arg) => arg.startsWith('--check='));

if (!writeArg && !checkArg) {
  console.error('Usage: node tooling/graphify/fingerprint.mjs --write=<file> | --check=<file>');
  process.exit(2);
}

const CODE_EXTS = new Set([
  '.py', '.ts', '.js', '.jsx', '.tsx', '.mjs', '.cjs', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp',
  '.rb', '.cs', '.kt', '.kts', '.scala', '.php', '.swift', '.lua', '.zig', '.ps1', '.ex', '.exs', '.m', '.mm', '.jl',
  '.vue', '.svelte', '.sql', '.sh', '.bash', '.json',
]);
const EXCLUDED_SEGMENTS = new Set(['graphify-out', 'node_modules', 'dist', 'coverage', 'build', 'target', '.git', 'docs']);

function trackedFiles() {
  // Include new files and ignore deleted paths so freshness checks also work
  // before a repository-wide move has been staged.
  const raw = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root });
  return raw
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)))
    .filter((file) => CODE_EXTS.has(path.extname(file).toLowerCase()))
    .filter((file) => !file.split('/').some((segment) => EXCLUDED_SEGMENTS.has(segment)))
    .sort();
}

function calculate() {
  const files = trackedFiles();
  const aggregate = crypto.createHash('sha256');
  const entries = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(root, file));
    const digest = crypto.createHash('sha256').update(content).digest('hex');
    entries.push({ path: file, sha256: digest });
    aggregate.update(file);
    aggregate.update('\0');
    aggregate.update(digest);
    aggregate.update('\0');
  }

  return {
    schemaVersion: 1,
    algorithm: 'sha256',
    scope: 'tracked code/config excluding docs and generated/build output',
    fileCount: files.length,
    digest: aggregate.digest('hex'),
    files: entries,
  };
}

const current = calculate();

if (writeArg) {
  const output = path.resolve(root, writeArg.slice('--write='.length));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Wrote Graphify source fingerprint: ${current.fileCount} files, ${current.digest}`);
}

if (checkArg) {
  const input = path.resolve(root, checkArg.slice('--check='.length));
  if (!fs.existsSync(input)) {
    console.error(`Graphify fingerprint is missing: ${path.relative(root, input)}`);
    process.exit(1);
  }
  const expected = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (expected.digest !== current.digest || expected.fileCount !== current.fileCount) {
    console.error('Committed Graphify graph is stale relative to tracked source code.');
    console.error(`Expected: ${expected.fileCount} files, ${expected.digest}`);
    console.error(`Current:  ${current.fileCount} files, ${current.digest}`);
    console.error('Regenerate Graphify and its code fingerprint before merging.');
    process.exit(1);
  }
  console.log(`Graphify source fingerprint is current: ${current.fileCount} files, ${current.digest}`);
}
