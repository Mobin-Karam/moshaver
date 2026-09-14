import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const adminRoot = resolve(import.meta.dirname, "../src");
const apiRoot = resolve(import.meta.dirname, "../../api/src/modules");
const walk = (dir, accept) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, accept) : accept(path) ? [path] : [];
  });
const adminFiles = walk(adminRoot, (file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test."));
const adminSource = adminFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const decorators = (node) => (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []);
const decorator = (node, name) =>
  decorators(node)
    .map((item) => item.expression)
    .find(
      (expression) => ts.isCallExpression(expression) && expression.expression.getText() === name,
    );
const stringArg = (call) => {
  const value = call?.arguments[0];
  if (value && ts.isStringLiteralLike(value)) return value.text;
  if (value && ts.isArrayLiteralExpression(value)) {
    const first = value.elements[0];
    return first && ts.isStringLiteralLike(first) ? first.text : "";
  }
  return "";
};
const normalize = (path) =>
  path
    .split("?")[0]
    .replace(/\$\{encodeURIComponent\([^)]*\)\}|\$\{[^}]+\}|:[^/]+/g, ":id")
    .replace(/\/+/g, "/");

const backend = [];
for (const file of walk(apiRoot, (path) => path.endsWith("controller.ts"))) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  source.forEachChild((node) => {
    if (!ts.isClassDeclaration(node)) return;
    const base = stringArg(decorator(node, "Controller"));
    const classRoles =
      decorator(node, "Roles")
        ?.arguments.map((arg) => arg.getText())
        .join(",") ?? "";
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      for (const method of ["Get", "Post", "Put", "Patch", "Delete"]) {
        const route = decorator(member, method);
        if (!route) continue;
        const path = normalize(`/${[base, stringArg(route)].filter(Boolean).join("/")}`);
        const roles = `${classRoles},${
          decorator(member, "Roles")
            ?.arguments.map((arg) => arg.getText())
            .join(",") ?? ""
        }`;
        const capabilities =
          decorator(member, "RequireCapabilities")
            ?.arguments.map((arg) => arg.getText())
            .join(",") ?? "";
        backend.push({ method: method.toUpperCase(), path, roles, capabilities });
      }
    }
  });
}

const routeText = (node) => {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node))
    return node.head.text + node.templateSpans.map((span) => `:id${span.literal.text}`).join("");
  return "";
};
const requests = new Set();
for (const file of adminFiles) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.arguments[0]
    ) {
      const method = node.expression.name.text.toUpperCase();
      const path = routeText(node.arguments[0]);
      if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) && path.startsWith("/"))
        requests.add(`${method} ${normalize(path)}`);
      if (["DOWNLOAD", "UPLOADBINARY"].includes(method) && path.startsWith("/"))
        requests.add(`POST ${normalize(path)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
for (const endpoint of ["POST /auth/refresh", "GET /auth/me", "GET /me/context"])
  if (adminSource.includes(endpoint.split(" ")[1])) requests.add(endpoint);

const dynamicConsumers = {
  "/export/json": ["GET /export/json"],
  "/import/template": ["GET /import/template"],
  "/push/status": ["GET /push/status"],
  'action: "activate" | "deactivate" | "restore" | "force-logout"': [
    "POST /students/:id/activate",
    "POST /students/:id/deactivate",
    "POST /students/:id/restore",
    "POST /students/:id/force-logout",
  ],
  'active ? "activate" : "deactivate"': ["POST /users/:id/activate", "POST /users/:id/deactivate"],
};
for (const [marker, endpoints] of Object.entries(dynamicConsumers))
  if (adminSource.includes(marker)) for (const endpoint of endpoints) requests.add(endpoint);

const studentRoutes = new Set([
  "GET /reports",
  "POST /reports",
  "POST /recovery-requests",
  "GET /recommendations",
  "PATCH /recommendations/:id",
  "GET /reviews",
  "GET /progress/weekly",
  "GET /learning/summary",
  "GET /learning/items",
  "POST /learning/items",
  "PATCH /learning/items/:id",
  "DELETE /learning/items/:id",
  "POST /learning/items/:id/review",
  "GET /learning/items/:id/reviews",
]);
const excluded = (endpoint) =>
  endpoint.roles.includes("STUDENT") ||
  endpoint.path === "/students/me" ||
  endpoint.path.startsWith("/student/") ||
  endpoint.path.startsWith("/mistakes") ||
  endpoint.path.startsWith("/sync") ||
  studentRoutes.has(`${endpoint.method} ${endpoint.path}`) ||
  endpoint.path.startsWith("/admin/") ||
  endpoint.path === "/onboarding/student-signup" ||
  endpoint.path.startsWith("/public/") ||
  `${endpoint.method} ${endpoint.path}` === "PUT /chat/conversations/:id/mute" ||
  `${endpoint.method} ${endpoint.path}` === "PUT /chat/groups/:id/owner";
const equivalentWorkflowRoutes = new Set([
  "GET /organizations/:id",
  "GET /relationships/:id",
  "PATCH /relationships/:id",
  "GET /students/:id/relationships",
  "GET /students/:id",
  "GET /users/:id",
  "GET /users/:id/roles",
  "GET /users/:id/capabilities",
]);
const equivalentWorkflow = (endpoint) =>
  equivalentWorkflowRoutes.has(`${endpoint.method} ${endpoint.path}`);
const required = backend.filter((endpoint) => !excluded(endpoint) && !equivalentWorkflow(endpoint));
const missing = required.filter((endpoint) => !requests.has(`${endpoint.method} ${endpoint.path}`));
console.log(
  `Backend routes: ${backend.length}; Admin-applicable workflow routes: ${required.length}; equivalent detail projections: ${backend.filter(equivalentWorkflow).length}; represented: ${required.length - missing.length}.`,
);
if (missing.length) {
  console.error("Missing Admin integrations:");
  for (const endpoint of missing)
    console.error(
      `- ${endpoint.method} ${endpoint.path}${endpoint.capabilities ? ` (${endpoint.capabilities})` : ""}`,
    );
  process.exit(1);
}
console.log("Parity gate: every Admin-applicable canonical backend route has an Admin consumer.");
