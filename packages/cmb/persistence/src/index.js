"use strict";

const { defineModule } = require("@moshaver/cmb-kernel");

const PERSISTENCE_MODULE = defineModule({ id: "persistence", version: "0.1.0", kind: "foundation", dependencies: ["kernel"], provides: ["persistence.migrations", "persistence.unit-of-work"] });
const MIGRATION_ID = /^[a-z][a-z0-9-]*:\d{14}:[a-z][a-z0-9-]*$/;

function defineMigration(input) {
  if (!input || typeof input !== "object") throw new TypeError("Migration descriptor is required.");
  const id = String(input.id ?? "").trim();
  const moduleId = String(input.moduleId ?? "").trim();
  if (!MIGRATION_ID.test(id) || !id.startsWith(`${moduleId}:`)) throw new TypeError("Migration id must be module:YYYYMMDDHHMMSS:name.");
  if (typeof input.up !== "function" || typeof input.down !== "function") throw new TypeError(`Migration ${id} requires up() and down().`);
  return Object.freeze({ id, moduleId, dependsOn: Object.freeze([...new Set(input.dependsOn ?? [])]), up: input.up, down: input.down });
}

class CmbMigrationRegistry {
  constructor(migrations = []) { this.migrations = new Map(); for (const migration of migrations) this.register(migration); }
  register(input) {
    const migration = defineMigration(input);
    if (this.migrations.has(migration.id)) throw new Error(`Duplicate migration: ${migration.id}`);
    this.migrations.set(migration.id, migration);
    return this;
  }
  ordered(moduleIds) {
    const modules = moduleIds ? new Set(moduleIds) : null;
    const selected = [...this.migrations.values()].filter((migration) => !modules || modules.has(migration.moduleId));
    const selectedIds = new Set(selected.map((migration) => migration.id));
    const visiting = new Set();
    const visited = new Set();
    const ordered = [];
    const visit = (migration) => {
      if (visited.has(migration.id)) return;
      if (visiting.has(migration.id)) throw new Error(`Circular migration dependency: ${migration.id}`);
      visiting.add(migration.id);
      for (const dependencyId of migration.dependsOn) {
        const dependency = this.migrations.get(dependencyId);
        if (!dependency) throw new Error(`Migration ${migration.id} requires missing migration: ${dependencyId}`);
        if (!selectedIds.has(dependencyId)) throw new Error(`Migration ${migration.id} requires migration from a disabled module: ${dependencyId}`);
        visit(dependency);
      }
      visiting.delete(migration.id);
      visited.add(migration.id);
      ordered.push(migration);
    };
    for (const migration of selected.sort((left, right) => left.id.localeCompare(right.id))) visit(migration);
    return Object.freeze(ordered);
  }
}

class UnitOfWork {
  constructor(transaction) { if (typeof transaction !== "function") throw new TypeError("UnitOfWork requires a transaction function."); this.transaction = transaction; }
  run(work) { if (typeof work !== "function") throw new TypeError("UnitOfWork work must be a function."); return this.transaction(work); }
}

module.exports = { PERSISTENCE_MODULE, MIGRATION_ID, defineMigration, CmbMigrationRegistry, UnitOfWork };
