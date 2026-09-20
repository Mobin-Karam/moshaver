"use strict";

const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { CmbModuleRegistry, defineModule } = require("@moshaver/cmb-kernel");
const { CmbHealthService, HEALTH_MODULE } = require("@moshaver/cmb-health");
const { InMemoryNoteStore } = require("./store");

const NOTES_MODULE = defineModule({
  id: "notes",
  version: "0.1.0",
  kind: "product",
  dependencies: ["health", "kernel"],
});

function send(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function roleFrom(request) {
  return String(request.headers["x-role"] ?? "VIEWER").trim().toUpperCase();
}

function createApp(options) {
  const config = options.config;
  const store = options.store ?? new InMemoryNoteStore();
  const registry = new CmbModuleRegistry([HEALTH_MODULE, NOTES_MODULE]);
  const enabled = ["health", "notes"].filter((id) => !config.disabledModules.includes(id));
  registry.resolve(enabled);
  const health = new CmbHealthService({
    serviceName: config.serviceName,
    probes: [{ name: "modules", check: () => registry.resolve(enabled) }],
  });

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/health") return send(response, 200, health.health());
      if (request.method === "GET" && url.pathname === "/ready") {
        const probes = await health.ready();
        return send(response, 200, { status: "ready", probes });
      }
      if (request.method === "GET" && url.pathname === "/modules") {
        return send(response, 200, { modules: registry.metadata(enabled) });
      }
      if (request.method === "GET" && url.pathname === "/notes") return send(response, 200, { notes: store.list() });
      if (request.method === "POST" && url.pathname === "/notes") {
        if (roleFrom(request) !== "OPERATOR") return send(response, 403, { code: "FORBIDDEN" });
        return send(response, 201, store.save({ id: randomUUID(), createdAt: new Date().toISOString() }));
      }
      return send(response, 404, { code: "NOT_FOUND" });
    } catch (error) {
      return send(response, 503, { code: "NOT_READY", message: error.message });
    }
  });

  return { server, registry, store };
}

module.exports = { NOTES_MODULE, createApp };
