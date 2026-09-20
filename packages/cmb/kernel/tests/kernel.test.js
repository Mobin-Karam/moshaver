"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CmbModuleRegistry, createToken, defineModule } = require("../src/index.js");

test("defineModule freezes a normalized descriptor", () => {
  const descriptor = defineModule({
    id: "example-module",
    version: "1.2.3",
    kind: "platform",
    dependencies: ["kernel", "kernel"],
  });
  assert.deepEqual(descriptor, { id: "example-module", version: "1.2.3", kind: "platform", dependencies: ["kernel"] });
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
