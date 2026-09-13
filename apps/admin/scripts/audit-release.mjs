import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const repository = resolve(root, "..");
const reportPath = join(root, "release-report.md");
const results = [];

function run(name, command, args, options = {}) {
  try {
    const output = execFileSync(command, args, {
      cwd: options.cwd || root,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    results.push({ name, status: "PASS", detail: options.detail || "Completed successfully." });
    process.stdout.write(output);
    return true;
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`;
    process.stdout.write(output);
    results.push({ name, status: "FAIL", detail: options.failure || "Command failed." });
    return false;
  }
}

function warn(name, detail) {
  results.push({ name, status: "WARN", detail });
}

function check(name, condition, detail, failure) {
  results.push({ name, status: condition ? "PASS" : "FAIL", detail: condition ? detail : failure });
}

console.log("ADMIN V2 RELEASE REPORT\n");

run("TypeScript", "npm", ["run", "typecheck"]);
run("Lint", "npm", ["run", "lint"]);
run("Formatting", "npm", ["run", "format:check"]);
run("Unit and component tests", "npm", ["test"]);
run("Accessibility", "npm", ["run", "test:a11y"], {
  detail: "Automated axe checks passed; visual contrast still requires a real browser.",
});
run("Coverage", "npm", ["run", "test:coverage"], {
  detail: "Scoped critical runtime and business modules met the configured thresholds.",
});
run("Production build", "npm", ["run", "build"]);
run("API parity", "npm", ["run", "audit:parity"]);
run("Browser test discovery", "npm", ["run", "test:e2e", "--", "--list"], {
  detail: "Playwright discovered the role-based browser smoke suite.",
});
run("Production dependency audit", "npm", ["audit", "--omit=dev", "--audit-level=high"]);

if (process.env.RUN_SECURITY_E2E === "1") {
  run("Live security matrix", "npm", ["run", "test:e2e:security"], {
    cwd: join(repository, "backend-v2"),
    detail: "Live cookie, CSRF, role, and organization isolation matrix passed.",
  });
} else {
  warn(
    "Live security matrix",
    "Not rerun: set RUN_SECURITY_E2E=1 with a migrated disposable backend and E2E_API_URL. Static parity, unit tests, and production dependency audit still run.",
  );
}

if (process.env.RUN_BROWSER_E2E === "1" && process.env.ADMIN_V2_E2E_BASE_URL) {
  run("Live browser roles", "npm", ["run", "test:e2e"]);
} else {
  warn(
    "Live browser roles",
    "Not run: set RUN_BROWSER_E2E=1 and ADMIN_V2_E2E_BASE_URL against a seeded disposable environment.",
  );
}

warn(
  "Web Push delivery",
  "Production-like HTTPS, browser permission, and VAPID delivery require external verification; see docs/operations/admin-v2-web-push-verification.md.",
);

const requiredDocs = [
  join(repository, "docs/ADMIN_V2_CAPABILITY_MATRIX.md"),
  join(repository, "docs/API_V1_V2_AUDIT.md"),
  join(root, "MIGRATION-AUDIT.md"),
  join(repository, "docs/operations/admin-v2-web-push-verification.md"),
];
check(
  "Documentation",
  requiredDocs.every(existsSync) &&
    readFileSync(requiredDocs[1], "utf8").includes("Historical migration comparison") &&
    readFileSync(requiredDocs[2], "utf8").includes("historical retirement contract"),
  "Current capability matrix and historical audit banners are present.",
  "A required release document or historical-status banner is missing.",
);

const assets = join(root, "dist/assets");
if (existsSync(assets)) {
  const js = readdirSync(assets)
    .filter((name) => name.endsWith(".js"))
    .map((name) => ({ name, bytes: statSync(join(assets, name)).size }))
    .sort((a, b) => b.bytes - a.bytes);
  const largest = js[0];
  check(
    "Bundle size",
    Boolean(largest) && largest.bytes <= 500 * 1024,
    `Largest JavaScript chunk is ${(largest.bytes / 1024).toFixed(2)} KiB (${largest.name}).`,
    `Largest JavaScript chunk exceeds 500 KiB: ${largest ? `${(largest.bytes / 1024).toFixed(2)} KiB` : "no output"}.`,
  );
} else {
  results.push({ name: "Bundle size", status: "FAIL", detail: "dist/assets was not generated." });
}

const blockers = results.filter((result) => result.status === "FAIL");
const generatedAt = new Date().toISOString();
const rows = results
  .map(
    (result) => `| ${result.name} | ${result.status} | ${result.detail.replaceAll("|", "\\|")} |`,
  )
  .join("\n");
const report = `# Admin v2 release report

Generated: ${generatedAt}

Branch: ${process.env.GITHUB_REF_NAME || "local checkout"}

| Gate | Result | Evidence or boundary |
| --- | --- | --- |
${rows}

## Release decision

${blockers.length ? `**BLOCKED** by ${blockers.length} failed gate(s).` : "**READY WITH WARNINGS.** No automated release blocker was found. Warnings require environment-specific verification and are not reported as passes."}

Coverage applies to the critical runtime and business-module list in \`vitest.config.ts\`; it is not a whole-source coverage claim. Generated output and local browser/VAPID boundaries are recorded above.
`;
writeFileSync(reportPath, report);

console.log("\n" + report);
if (blockers.length) process.exitCode = 1;
