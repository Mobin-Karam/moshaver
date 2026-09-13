"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createToken, defineModule } = require("../src/index.js");

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
