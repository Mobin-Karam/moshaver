"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { SYSTEM_MODULE, isValidAppVersion, projectAuditRecord } = require("../src");
test("declares the reusable system module", () => { assert.equal(SYSTEM_MODULE.id, "system"); assert.deepEqual(SYSTEM_MODULE.dependencies, ["kernel"]); });
test("validates application release versions", () => { assert.equal(isValidAppVersion("2.1.0"), true); assert.equal(isValidAppVersion("2.1.0-beta.1"), true); assert.equal(isValidAppVersion("2.1"), false); });
test("projects audit records without persistence objects", () => { const createdAt = new Date("2026-09-13T00:00:00Z"); assert.deepEqual(projectAuditRecord({ id: "a1", action: "created", entity: "user", createdAt }), { id: "a1", action: "created", entity: "user", actorUserId: null, metadata: null, createdAt }); });
