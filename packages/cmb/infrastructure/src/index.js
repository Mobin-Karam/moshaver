"use strict";
const crypto = require("node:crypto");
const { defineModule } = require("@moshaver/cmb-kernel");
const INFRASTRUCTURE_MODULE = defineModule({ id: "infrastructure", version: "0.1.0", kind: "adapter", dependencies: ["health", "kernel"], provides: ["infrastructure.adapters"], requires: ["health.service"] });

class CmbAdapterRegistry {
  constructor(adapters = []) { this.adapters = new Map(); for (const adapter of adapters) this.register(adapter); }
  register(adapter) {
    const port = String(adapter?.port ?? "").trim(); const id = String(adapter?.id ?? "").trim();
    if (!port || !id) throw new TypeError("Adapter requires port and id.");
    if (this.adapters.has(port)) throw new Error(`Adapter already registered for port: ${port}`);
    this.adapters.set(port, Object.freeze({ ...adapter, port, id })); return this;
  }
  resolve(port) { const adapter = this.adapters.get(port); if (!adapter) throw new Error(`Required adapter is not configured: ${port}`); return adapter; }
  inventory() { return Object.freeze([...this.adapters.values()].map(({ port, id, required = false }) => Object.freeze({ port, id, required: Boolean(required) }))); }
  readinessProbes() { return [...this.adapters.values()].filter((adapter) => adapter.required).map((adapter) => ({ name: `adapter:${adapter.port}`, check: async () => { if (typeof adapter.ready === "function") await adapter.ready(); } })); }
}

class InMemoryKeyValueCache { constructor() { this.values = new Map(); } async get(key) { return this.values.get(key); } async set(key, value) { this.values.set(key, value); } async delete(key) { return this.values.delete(key); } async ready() {} }
class InlineJobQueue { async enqueue(job) { return job.run(); } async ready() {} }
class InMemoryObjectStorage { constructor() { this.objects = new Map(); } async put(key, value) { this.objects.set(key, value); return key; } async get(key) { return this.objects.get(key) ?? null; } async ready() {} }
class InMemoryEventBus { constructor() { this.listeners = new Map(); } subscribe(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); return () => listeners.delete(listener); } async publish(event) { for (const listener of this.listeners.get(event.type) ?? []) await listener(event); } async ready() {} }
class NoopDeliveryProvider { constructor(id = "noop") { this.id = id; } async deliver() {} async ready() {} }
class SystemClock { now() { return new Date(); } }
class RandomIdGenerator { next() { return crypto.randomUUID(); } }

module.exports = { INFRASTRUCTURE_MODULE, CmbAdapterRegistry, InMemoryKeyValueCache, InlineJobQueue, InMemoryObjectStorage, InMemoryEventBus, NoopDeliveryProvider, SystemClock, RandomIdGenerator };
