"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { IDENTITY_MODULE, normalizeUsername, projectCapabilities, uniqueValues } = require("../src");
test("declares the reusable identity module", () => { assert.equal(IDENTITY_MODULE.id, "identity"); assert.deepEqual(IDENTITY_MODULE.dependencies, ["kernel"]); });
test("normalizes usernames consistently", () => { assert.equal(normalizeUsername("  Mixed.User  "), "mixed.user"); assert.throws(() => normalizeUsername("  "), /required/); });
test("deduplicates roles and capabilities", () => { assert.deepEqual(uniqueValues(["ADMIN", "ADMIN", " STUDENT ", ""]), ["ADMIN", "STUDENT"]); assert.deepEqual(projectCapabilities([{ capabilities: ["users.read", "users.read"] }, { capabilities: ["users.write"] }]), ["users.read", "users.write"]); });
