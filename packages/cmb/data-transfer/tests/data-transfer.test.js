"use strict";
const test = require("node:test"); const assert = require("node:assert/strict"); const { containsForbiddenFields, nonNegativeNumber, positiveNumber, summarizeCollections } = require("../src");
test("rejects security authority fields at any depth", () => { assert.equal(containsForbiddenFields({ rows: [{ passwordHash: "secret" }] }), true); assert.equal(containsForbiddenFields({ rows: [{ title: "safe" }] }), false); });
test("normalizes numeric import values", () => { assert.equal(nonNegativeNumber(-2), 0); assert.equal(nonNegativeNumber("3"), 3); assert.equal(positiveNumber(0), 1); });
test("summarizes generic collections", () => { assert.deepEqual(summarizeCollections({ users: [1, 2], errors: 3 }), { users: 2, errors: 3 }); });
