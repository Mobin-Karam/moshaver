"use strict";

const { defineModule } = require("@moshaver/cmb-kernel");

const HEALTH_MODULE = defineModule({
  id: "health",
  version: "0.1.0",
  kind: "foundation",
  dependencies: ["kernel"],
  provides: ["health.service"],
  health: ["liveness", "readiness"],
  configuration: { serviceName: "required", probes: "optional" },
});

class ReadinessError extends Error {
  constructor(probe, cause) {
    super(`Readiness probe failed: ${probe}`);
    this.name = "ReadinessError";
    this.probe = probe;
    this.cause = cause;
  }
}

class CmbHealthService {
  constructor(options) {
    if (!options || typeof options !== "object") throw new TypeError("Health options are required.");
    this.serviceName = String(options.serviceName ?? "").trim();
    if (!this.serviceName) throw new TypeError("Health serviceName is required.");

    this.probes = Array.from(options.probes ?? []);
    const names = new Set();
    for (const probe of this.probes) {
      if (!probe || typeof probe !== "object" || typeof probe.check !== "function") throw new TypeError("Each readiness probe requires a check() function.");
      const name = String(probe.name ?? "").trim();
      if (!name) throw new TypeError("Each readiness probe requires a name.");
      if (names.has(name)) throw new TypeError(`Duplicate readiness probe: ${name}`);
      names.add(name);
    }
  }

  health() {
    return { service: this.serviceName, status: "ok" };
  }

  async ready() {
    const result = {};
    for (const probe of this.probes) {
      try {
        await probe.check();
        result[probe.name] = "ready";
      } catch (cause) {
        throw new ReadinessError(probe.name, cause);
      }
    }
    return result;
  }
}

module.exports = {
  HEALTH_MODULE,
  ReadinessError,
  CmbHealthService,
};
