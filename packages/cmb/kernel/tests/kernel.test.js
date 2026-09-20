"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CmbModuleRegistry, createToken, defineModule } = require("../src/index.js");

test("defineModule freezes a normalized descriptor", () => {
  const descriptor = defineModule({
    id: "example-module",
    version: "1.2.3",
    kind: "platform",
    dependencies: ["kernel", "kernel"],
    optionalDependencies: ["metrics"],
    provides: ["example.service"],
    routes: ["GET /example"],
    permissions: ["example.read"],
  });
  assert.equal(descriptor.id, "example-module");
  assert.deepEqual(descriptor.dependencies, ["kernel"]);
  assert.deepEqual(descriptor.optionalDependencies, ["metrics"]);
  assert.deepEqual(descriptor.provides, ["example.service"]);
  assert.deepEqual(descriptor.routes, ["GET /example"]);
  assert.deepEqual(descriptor.permissions, ["example.read"]);
  assert.equal(Object.isFrozen(descriptor), true);
  assert.equal(Object.isFrozen(descriptor.dependencies), true);
});

test("defineModule rejects invalid and self dependencies", () => {
  assert.throws(() => defineModule({ id: "Bad Id", version: "1.0.0", kind: "platform" }), /Invalid CMB module id/);
  assert.throws(() => defineModule({ id: "health", version: "1.0.0", kind: "foundation", dependencies: ["health"] }), /cannot depend on itself/);
});

test("createToken is stable across calls", () => {
  assert.equal(createToken("health", "probe"), createToken("health", "probe"));
});

test("registry resolves dependencies and lifecycle in deterministic order", async () => {
  const calls = [];
  const health = defineModule({ id: "health", version: "1.0.0", kind: "foundation", dependencies: ["kernel"] });
  const api = defineModule({ id: "api", version: "1.0.0", kind: "adapter", dependencies: ["health"] });
  const registry = new CmbModuleRegistry([
    { descriptor: api, start: () => calls.push("start-api"), stop: () => calls.push("stop-api") },
    { descriptor: health, start: () => calls.push("start-health"), stop: () => calls.push("stop-health") },
  ]);
  assert.deepEqual(registry.metadata(["health", "api"]).map((item) => item.id), ["kernel", "health", "api"]);
  await registry.start({}, ["health", "api"]);
  await registry.stop({});
  assert.deepEqual(calls, ["start-health", "start-api", "stop-api", "stop-health"]);
});

test("registry fails clearly for missing, disabled, duplicate, and circular dependencies", () => {
  const missing = defineModule({ id: "missing-consumer", version: "1.0.0", kind: "platform", dependencies: ["not-installed"] });
  assert.throws(() => new CmbModuleRegistry([missing]).resolve(), /requires missing dependency: not-installed/);
  const health = defineModule({ id: "health", version: "1.0.0", kind: "foundation", dependencies: ["kernel"] });
  const api = defineModule({ id: "api", version: "1.0.0", kind: "adapter", dependencies: ["health"] });
  assert.throws(() => new CmbModuleRegistry([health, api]).resolve(["api"]), /requires disabled dependency: health/);
  assert.throws(() => new CmbModuleRegistry([health, health]), /Duplicate CMB module: health/);
  const left = defineModule({ id: "left", version: "1.0.0", kind: "platform", dependencies: ["right"] });
  const right = defineModule({ id: "right", version: "1.0.0", kind: "platform", dependencies: ["left"] });
  assert.throws(() => new CmbModuleRegistry([left, right]).resolve(), /Circular CMB module dependency/);
});

test("registry rejects forbidden dependency direction and missing services", () => {
  const product = defineModule({ id: "product-domain", version: "1.0.0", kind: "product" });
  const platform = defineModule({ id: "bad-platform", version: "1.0.0", kind: "platform", dependencies: ["product-domain"] });
  assert.throws(() => new CmbModuleRegistry([product, platform]).resolve(), /Forbidden CMB dependency/);
  const consumer = defineModule({ id: "consumer", version: "1.0.0", kind: "product", requires: ["missing.service"] });
  assert.throws(() => new CmbModuleRegistry([consumer]).resolve(), /requires missing service/);
});

test("registry rolls back already-started modules when startup fails", async () => {
  const calls = [];
  const first = defineModule({ id: "first", version: "1.0.0", kind: "platform", dependencies: ["kernel"] });
  const second = defineModule({ id: "second", version: "1.0.0", kind: "platform", dependencies: ["first"] });
  const registry = new CmbModuleRegistry([
    { descriptor: first, start: () => calls.push("start-first"), stop: () => calls.push("stop-first") },
    { descriptor: second, start: () => { throw new Error("startup failed"); } },
  ]);
  await assert.rejects(registry.start(), /startup failed/);
  assert.deepEqual(calls, ["start-first", "stop-first"]);
});

test("upgrades an earlier 0.1.0 descriptor by applying compatible metadata defaults", () => {
  const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/descriptor-0.1.0.json"), "utf8"));
  const [kernel, upgraded] = new CmbModuleRegistry([legacy]).metadata();
  assert.equal(kernel.id, "kernel");
  assert.equal(upgraded.id, "legacy-module");
  assert.deepEqual(upgraded.optionalDependencies, []);
  assert.deepEqual(upgraded.events, { publishes: [], subscribes: [] });
});
