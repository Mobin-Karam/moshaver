"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { InMemoryRealtimeHub, REALTIME_MODULE } = require("../src/index.js");

test("hub subscribes, emits and cleans up connections", () => {
  const hub = new InMemoryRealtimeHub();
  const received = [];
  const unsubscribe = hub.subscribe("u1", (event) => received.push(event));
  assert.equal(hub.connectionCount("u1"), 1);
  assert.equal(hub.emitToUser("u1", "message", { id: "m1" }), 1);
  assert.deepEqual(received, [{ type: "message", data: { id: "m1" } }]);
  unsubscribe();
  assert.equal(hub.connectionCount("u1"), 0);
  assert.equal(REALTIME_MODULE.kind, "platform");
});

test("emitToUsers deduplicates recipient ids", () => {
  const hub = new InMemoryRealtimeHub();
  let u1 = 0;
  let u2 = 0;
  hub.subscribe("u1", () => { u1 += 1; });
  hub.subscribe("u2", () => { u2 += 1; });
  assert.equal(hub.emitToUsers(["u1", "u1", "u2"], "notification.created", {}), 2);
  assert.equal(u1, 1);
  assert.equal(u2, 1);
});
