import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const contractPath = path.join(root, "packages/api-contract/src/index.ts");
const migrationPath = path.join(
  root,
  "apps/api/src/database/migrations/1724140700000-IdentityAuthorization.ts",
);
const backendSrc = path.join(root, "apps/api/src");
const errors = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function extractArray(source, name) {
  const match = source.match(
    new RegExp(`export const ${name} = \\[(.*?)\\] as const;`, "s"),
  );
  if (!match) throw new Error(`Cannot find ${name} in API contract.`);
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, output);
    else if (entry.isFile() && entry.name.endsWith(".ts"))
      output.push(absolute);
  }
  return output;
}

const contract = fs.readFileSync(contractPath, "utf8");
const contractRoles = new Set(extractArray(contract, "ROLE_CODES"));
const contractCapabilities = new Set(extractArray(contract, "CAPABILITIES"));
const migration = fs.readFileSync(migrationPath, "utf8");
const migrationRoles = new Set(
  [...migration.matchAll(/\["([A-Z_]+)",\s*"[^"]+",\s*[01]\]/g)].map(
    (item) => item[1],
  ),
);

for (const role of migrationRoles) {
  if (!contractRoles.has(role))
    errors.push(`API contract is missing backend role ${role}`);
}
for (const role of contractRoles) {
  if (!migrationRoles.has(role))
    errors.push(
      `API contract role ${role} is not seeded by the backend identity migration`,
    );
}

const capabilityPrefixes = new Set([
  "organization",
  "users",
  "students",
  "student",
  "subjects",
  "studentSubjects",
  "learning",
  "plans",
  "tasks",
  "exams",
  "questions",
  "syllabus",
  "retry_requests",
  "quizzes",
  "quiz_questions",
  "mistakes",
  "chat",
  "reports",
  "analytics",
  "recommendations",
  "import",
  "export",
  "release",
  "audit",
  "system",
  "database",
]);
const capabilityActions = new Set([
  "read",
  "manage",
  "create",
  "update",
  "archive",
  "publish",
  "delete",
  "assign",
  "send",
  "moderate",
  "preview",
  "commit",
  "backup",
  "restore",
  "review",
]);
const ignoredEventLiterals = new Set([
  "system.update",
  "plan.updated",
  "exam.created",
  "notification.created",
  "chat.message.created",
]);
const backendCapabilities = new Set();

for (const file of walk(backendSrc)) {
  const source = fs.readFileSync(file, "utf8");
  for (const decorator of source.matchAll(/RequireCapabilities\(([^)]*)\)/g)) {
    for (const capability of decorator[1].matchAll(/["']([^"']+)["']/g)) {
      backendCapabilities.add(capability[1]);
    }
  }
  for (const requirement of source.matchAll(
    /\.requireCapability\([^,]+,\s*["']([^"']+)["']\)/g,
  )) {
    backendCapabilities.add(requirement[1]);
  }
  for (const match of source.matchAll(
    /["'`]([a-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)["'`]/g,
  )) {
    const value = match[1];
    if (ignoredEventLiterals.has(value)) continue;
    const parts = value.split(".");
    if (!capabilityPrefixes.has(parts[0])) continue;
    if (!capabilityActions.has(parts.at(-1))) continue;
    backendCapabilities.add(value);
  }
}

for (const capability of backendCapabilities) {
  if (!contractCapabilities.has(capability))
    errors.push(`API contract is missing backend capability ${capability}`);
}

const frontendCapabilities = new Set();
for (const frontendRoot of [
  path.join(root, "apps/admin/src"),
  path.join(root, "apps/student/src"),
]) {
  for (const file of walk(frontendRoot)) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of [
      /(?:auth\.can|has)\(["']([^"']+)["']\)/g,
      /capability(?:=|:)\s*["']([^"']+)["']/g,
    ]) {
      for (const match of source.matchAll(pattern))
        frontendCapabilities.add(match[1]);
    }
  }
}
for (const capability of frontendCapabilities) {
  if (!contractCapabilities.has(capability))
    errors.push(`API contract is missing frontend capability ${capability}`);
  if (!backendCapabilities.has(capability))
    errors.push(
      `Frontend capability ${capability} has no backend authorization declaration`,
    );
}

const baseMatch = contract.match(
  /export const API_BASE_PATH = "([^"]+)" as const;/,
);
const versionMatch = contract.match(
  /export const API_VERSION = "([^"]+)" as const;/,
);
const main = read("apps/api/src/main.ts");
const prefixMatch = main.match(/setGlobalPrefix\("([^"]+)"/);
if (!baseMatch || !versionMatch)
  errors.push("API contract must export API_BASE_PATH and API_VERSION.");
else {
  if (baseMatch[1] !== `/${prefixMatch?.[1] ?? ""}`)
    errors.push(
      `API_BASE_PATH ${baseMatch[1]} does not match backend prefix /${prefixMatch?.[1] ?? "<missing>"}`,
    );
  if (versionMatch[1] !== "v2")
    errors.push(`Unexpected stable API version ${versionMatch[1]}`);
}

const envelope = read("apps/api/src/common/utils/envelope.ts");
const filter = read("apps/api/src/common/filters/http-exception.filter.ts");
if (!envelope.includes("ok: true"))
  errors.push("Backend success envelope no longer matches ApiSuccess<T>.");
if (!filter.includes("ok: false"))
  errors.push("Backend error envelope no longer matches ApiErrorContract.");
if (!main.includes('required: ["ok", "error"]'))
  errors.push("OpenAPI ApiError schema must require ok + error.");

if (errors.length) {
  console.error("API contract check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `API contract OK: ${contractRoles.size} roles, ${contractCapabilities.size} declared capabilities, ${backendCapabilities.size} backend capabilities, ${frontendCapabilities.size} guarded frontend capabilities, ${baseMatch?.[1]}.`,
);
