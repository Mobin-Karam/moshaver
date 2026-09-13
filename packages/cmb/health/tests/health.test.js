"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CmbHealthService, HEALTH_MODULE, ReadinessError } = require("../src/index.js");

test("health returns a stable liveness payload", () => {
  const service = new CmbHealthService({ serviceName: "example" });
  assert.deepEqual(service.health(), { service: "example", status: "ok" });
  assert.equal(HEALTH_MODULE.kind, "foundation");
});

test("ready executes named probes", async () => {
  let calls = 0;
  const service = new CmbHealthService({
    serviceName: "example",
    probes: [{ name: "database", check: async () => { calls += 1; } }],
  });
  assert.deepEqual(await service.ready(), { database: "ready" });
  assert.equal(calls, 1);
});

test("ready identifies the failing probe without owning transport policy", async () => {
  const cause = new Error("down");
  const service = new CmbHealthService({
    serviceName: "example",
    probes: [{ name: "database", check: async () => { throw cause; } }],
  });
  await assert.rejects(service.ready(), (error) => error instanceof ReadinessError && error.probe === "database" && error.cause === cause);
});
