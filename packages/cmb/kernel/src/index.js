"use strict";

const CMB_MODULE_KINDS = Object.freeze(["kernel", "foundation", "platform", "adapter", "product"]);
const MODULE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function defineModule(input) {
  if (!input || typeof input !== "object") throw new TypeError("CMB module descriptor must be an object.");
  const id = String(input.id ?? "").trim();
  const version = String(input.version ?? "").trim();
  const kind = String(input.kind ?? "").trim();
  const dependencies = [...new Set(Array.from(input.dependencies ?? [], (value) => String(value).trim()).filter(Boolean))];

  if (!MODULE_ID_PATTERN.test(id)) throw new TypeError(`Invalid CMB module id: ${id || "<empty>"}`);
  if (!VERSION_PATTERN.test(version)) throw new TypeError(`Invalid CMB module version: ${version || "<empty>"}`);
  if (!CMB_MODULE_KINDS.includes(kind)) throw new TypeError(`Invalid CMB module kind: ${kind || "<empty>"}`);
  if (dependencies.includes(id)) throw new TypeError(`CMB module ${id} cannot depend on itself.`);
  for (const dependency of dependencies) {
    if (!MODULE_ID_PATTERN.test(dependency)) throw new TypeError(`Invalid CMB dependency id: ${dependency}`);
  }

  return Object.freeze({
    id,
    version,
    kind,
    dependencies: Object.freeze(dependencies),
  });
}

function createToken(scope, name) {
  const normalizedScope = String(scope ?? "").trim();
  const normalizedName = String(name ?? "").trim();
  if (!MODULE_ID_PATTERN.test(normalizedScope)) throw new TypeError("CMB token scope must be a valid module id.");
  if (!normalizedName) throw new TypeError("CMB token name is required.");
  return Symbol.for(`cmb:${normalizedScope}:${normalizedName}`);
}

module.exports = {
  CMB_MODULE_KINDS,
  defineModule,
  createToken,
};
