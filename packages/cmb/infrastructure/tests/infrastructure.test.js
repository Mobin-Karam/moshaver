"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { CmbAdapterRegistry, InMemoryEventBus, InMemoryKeyValueCache } = require("../src");
test("registers replaceable adapters and exposes safe inventory", async () => {
  const first = new InMemoryKeyValueCache();
  const second = new InMemoryKeyValueCache();
  const registry = new CmbAdapterRegistry([{ port: "cache", id: "memory", required: true, ...first, get: first.get.bind(first), set: first.set.bind(first), ready: first.ready.bind(first) }]);
  assert.equal(registry.resolve("cache").id, "memory");
  assert.deepEqual(registry.inventory(), [{ port: "cache", id: "memory", required: true }]);
  assert.throws(() => registry.register({ port: "cache", id: "replacement", ...second }), /already registered/);
  await registry.readinessProbes()[0].check();
});
test("required adapter readiness failures remain attributable", async () => {
  const registry = new CmbAdapterRegistry([{ port: "database", id: "offline", required: true, ready: async () => { throw new Error("unavailable"); } }]);
  await assert.rejects(registry.readinessProbes()[0].check(), /unavailable/);
});
test("in-memory event transport can be replaced behind the same port", async () => {
  const bus = new InMemoryEventBus(); const events = []; bus.subscribe("created", (event) => events.push(event.data)); await bus.publish({ type: "created", data: 1 }); assert.deepEqual(events, [1]);
});
