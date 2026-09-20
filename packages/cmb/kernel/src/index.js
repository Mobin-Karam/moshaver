"use strict";

const CMB_MODULE_KINDS = Object.freeze(["kernel", "foundation", "platform", "adapter", "product"]);
const MODULE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const KERNEL_MODULE = Object.freeze({ id: "kernel", version: "0.1.0", kind: "kernel", dependencies: Object.freeze([]) });

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

class CmbModuleRegistry {
  constructor(registrations = []) {
    this.registrations = new Map([[KERNEL_MODULE.id, { descriptor: KERNEL_MODULE }]]);
    this.started = [];
    for (const registration of registrations) this.register(registration);
  }

  register(registration) {
    const value = registration?.descriptor ? registration : { descriptor: registration };
    const descriptor = defineModule(value.descriptor);
    if (descriptor.id === KERNEL_MODULE.id || this.registrations.has(descriptor.id)) throw new Error(`Duplicate CMB module: ${descriptor.id}`);
    for (const hook of ["start", "stop"]) if (value[hook] !== undefined && typeof value[hook] !== "function") throw new TypeError(`CMB module ${descriptor.id} ${hook} hook must be a function.`);
    this.registrations.set(descriptor.id, Object.freeze({ descriptor, start: value.start, stop: value.stop }));
    return this;
  }

  resolve(enabledIds) {
    const enabled = enabledIds === undefined ? new Set(this.registrations.keys()) : new Set(["kernel", ...enabledIds]);
    for (const id of enabled) if (!this.registrations.has(id)) throw new Error(`Unknown enabled CMB module: ${id}`);
    const visiting = new Set();
    const visited = new Set();
    const ordered = [];
    const visit = (id, path = []) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular CMB module dependency: ${[...path, id].join(" -> ")}`);
      visiting.add(id);
      const registration = this.registrations.get(id);
      for (const dependency of registration.descriptor.dependencies) {
        if (!this.registrations.has(dependency)) throw new Error(`CMB module ${id} requires missing dependency: ${dependency}`);
        if (!enabled.has(dependency)) throw new Error(`CMB module ${id} requires disabled dependency: ${dependency}`);
        visit(dependency, [...path, id]);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(registration);
    };
    for (const id of enabled) visit(id);
    return Object.freeze(ordered);
  }

  metadata(enabledIds) {
    return Object.freeze(this.resolve(enabledIds).map(({ descriptor }) => descriptor));
  }

  async start(context = {}, enabledIds) {
    if (this.started.length) throw new Error("CMB module registry is already started.");
    for (const registration of this.resolve(enabledIds)) {
      await registration.start?.(context);
      this.started.push(registration);
    }
    return this.metadata(enabledIds);
  }

  async stop(context = {}) {
    for (const registration of [...this.started].reverse()) await registration.stop?.(context);
    this.started = [];
  }
}

module.exports = {
  CMB_MODULE_KINDS,
  KERNEL_MODULE,
  CmbModuleRegistry,
  defineModule,
  createToken,
};
