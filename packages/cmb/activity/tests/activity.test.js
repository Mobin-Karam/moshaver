"use strict";
const test = require("node:test"); const assert = require("node:assert/strict"); const { normalizePresenceState, shouldPersistPresence, projectPresence, clampActivityLimit } = require("../src");
test("normalizes presence states", () => { assert.equal(normalizePresenceState("studying"), "studying"); assert.equal(normalizePresenceState("unknown"), "idle"); });
test("debounces unchanged presence", () => { const previous = { state: "idle", resourceId: null, lastSeenAt: new Date(1_000) }; assert.equal(shouldPersistPresence(previous, { state: "idle", resourceId: null }, new Date(20_000)), false); assert.equal(shouldPersistPresence(previous, { state: "studying", resourceId: null }, new Date(2_000)), true); });
test("projects offline state and bounds history", () => { const lastSeenAt = new Date(1_000); assert.equal(projectPresence({ state: "studying", lastSeenAt }, new Date(100_000)).state, "offline"); assert.equal(clampActivityLimit(500), 100); });
