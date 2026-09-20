"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { CmbMigrationRegistry, UnitOfWork, defineMigration } = require("../src");
const migration = (id, moduleId, dependsOn = []) => defineMigration({ id, moduleId, dependsOn, up: async () => undefined, down: async () => undefined });
test("discovers module-owned migrations in deterministic dependency order", () => {
  const registry = new CmbMigrationRegistry([
    migration("notes:20260920000200:add-index", "notes", ["identity:20260920000100:create-users"]),
    migration("identity:20260920000100:create-users", "identity"),
    migration("notes:20260920000100:create-notes", "notes"),
  ]);
  assert.deepEqual(registry.ordered().map((item) => item.id), ["identity:20260920000100:create-users", "notes:20260920000100:create-notes", "notes:20260920000200:add-index"]);
  assert.throws(() => registry.ordered(["notes"]), /disabled module/);
});
test("rejects malformed, duplicate, missing, and circular migration declarations", () => {
  assert.throws(() => defineMigration({ id: "bad", moduleId: "notes", up() {}, down() {} }), /Migration id/);
  const one = migration("notes:20260920000100:create-notes", "notes");
  assert.throws(() => new CmbMigrationRegistry([one, one]), /Duplicate/);
  assert.throws(() => new CmbMigrationRegistry([migration("notes:20260920000200:add", "notes", ["missing:20260920000100:nope"])]).ordered(), /missing migration/);
  const a = migration("a:20260920000100:first", "a", ["b:20260920000100:first"]);
  const b = migration("b:20260920000100:first", "b", [a.id]);
  assert.throws(() => new CmbMigrationRegistry([a, b]).ordered(), /Circular/);
});
test("unit of work delegates a cross-module workflow to the host transaction adapter", async () => {
  const events = [];
  const unit = new UnitOfWork(async (work) => { events.push("begin"); const result = await work({ db: "transaction" }); events.push("commit"); return result; });
  assert.equal(await unit.run(async (context) => context.db), "transaction");
  assert.deepEqual(events, ["begin", "commit"]);
});
