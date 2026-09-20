"use strict";

const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { CmbModuleRegistry, defineModule } = require("@moshaver/cmb-kernel");
const { CmbHealthService, HEALTH_MODULE } = require("@moshaver/cmb-health");
const {
  CmbAdapterRegistry,
  INFRASTRUCTURE_MODULE,
} = require("@moshaver/cmb-infrastructure");
const { AUTH_MODULE, InMemorySessionStore } = require("@moshaver/cmb-auth");
const {
  AUTHORIZATION_MODULE,
  hasCapability,
} = require("@moshaver/cmb-authorization");
const { IDENTITY_MODULE } = require("@moshaver/cmb-identity");
const {
  NOTIFICATIONS_MODULE,
  InMemoryNotificationRepository,
  NotificationService,
} = require("@moshaver/cmb-notifications");
const {
  CmbMigrationRegistry,
  PERSISTENCE_MODULE,
  defineMigration,
} = require("@moshaver/cmb-persistence");
const {
  REALTIME_MODULE,
  InMemoryRealtimeHub,
} = require("@moshaver/cmb-realtime");
const { TENANCY_MODULE } = require("@moshaver/cmb-tenancy");
const { InMemoryNoteStore } = require("./store");

const NOTES_MODULE = defineModule({
  id: "notes",
  version: "0.1.0",
  kind: "product",
  dependencies: [
    "authorization",
    "infrastructure",
    "notifications",
    "persistence",
    "realtime",
  ],
  requires: [
    "infrastructure.adapters",
    "notifications.service",
    "persistence.migrations",
    "security.authorization",
  ],
  routes: ["GET /notes", "POST /notes"],
  migrations: ["notes:20260920000100:create-notes"],
  permissions: ["notes.read", "notes.write"],
  publishes: ["note.created"],
});

function send(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function accessTokenFrom(request) {
  const cookies = String(request.headers.cookie ?? "")
    .split(";")
    .map((value) => value.trim());
  const cookie = cookies.find((value) => value.startsWith("cmb_session="));
  return cookie ? decodeURIComponent(cookie.slice("cmb_session=".length)) : "";
}

function createApp(options) {
  const config = options.config;
  const store = options.store ?? new InMemoryNoteStore();
  const sessions = options.sessions ?? new InMemorySessionStore();
  const realtime = options.realtime ?? new InMemoryRealtimeHub();
  const notificationRepository =
    options.notificationRepository ?? new InMemoryNotificationRepository();
  const adapters = new CmbAdapterRegistry([
    {
      port: "notes.store",
      id: options.store ? "injected" : "memory",
      required: true,
      ready: async () => undefined,
      store,
    },
    {
      port: "notifications.repository",
      id: options.notificationRepository ? "injected" : "memory",
      required: true,
      ready: async () => undefined,
      repository: notificationRepository,
    },
  ]);
  const migrations = new CmbMigrationRegistry([
    defineMigration({
      id: "notes:20260920000100:create-notes",
      moduleId: "notes",
      up: async () => undefined,
      down: async () => undefined,
    }),
  ]);
  const notificationService = new NotificationService({
    repository: notificationRepository,
    providers: options.notificationProviders,
    events: {
      publish: async (event) =>
        realtime.emitToUser(event.data.recipientId, event.type, event.data),
    },
  });
  const identities = new Map([
    [
      "viewer",
      { subjectId: "viewer", roles: ["VIEWER"], capabilities: ["notes.read"] },
    ],
    [
      "operator",
      {
        subjectId: "operator",
        roles: ["OPERATOR"],
        capabilities: ["notes.read", "notes.write"],
      },
    ],
  ]);
  const registry = new CmbModuleRegistry([
    HEALTH_MODULE,
    INFRASTRUCTURE_MODULE,
    PERSISTENCE_MODULE,
    IDENTITY_MODULE,
    TENANCY_MODULE,
    AUTH_MODULE,
    AUTHORIZATION_MODULE,
    NOTIFICATIONS_MODULE,
    REALTIME_MODULE,
    NOTES_MODULE,
  ]);
  const enabled = [
    "health",
    "infrastructure",
    "persistence",
    "identity",
    "tenancy",
    "auth",
    "authorization",
    "notifications",
    "realtime",
    "notes",
  ].filter((id) => !config.disabledModules.includes(id));
  registry.resolve(enabled);
  const health = new CmbHealthService({
    serviceName: config.serviceName,
    probes: [
      { name: "modules", check: () => registry.resolve(enabled) },
      ...adapters.readinessProbes(),
    ],
  });

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/health")
        return send(response, 200, health.health());
      if (request.method === "GET" && url.pathname === "/ready") {
        const probes = await health.ready();
        return send(response, 200, { status: "ready", probes });
      }
      if (request.method === "GET" && url.pathname === "/modules") {
        return send(response, 200, {
          modules: registry.metadata(enabled),
          migrations: migrations.ordered().map((migration) => migration.id),
        });
      }
      if (request.method === "GET" && url.pathname === "/adapters") {
        return send(response, 200, { adapters: adapters.inventory() });
      }
      if (request.method === "POST" && url.pathname === "/sessions") {
        const identity = identities.get(
          String((await readJson(request)).username ?? "")
            .trim()
            .toLowerCase(),
        );
        if (!identity)
          return send(response, 401, { code: "INVALID_CREDENTIALS" });
        const credentials = sessions.create(identity.subjectId, identity);
        response.setHeader(
          "set-cookie",
          `cmb_session=${encodeURIComponent(credentials.accessToken)}; HttpOnly; SameSite=Lax; Path=/`,
        );
        return send(response, 201, {
          csrfToken: credentials.csrfToken,
          identity,
        });
      }
      const accessToken = accessTokenFrom(request);
      const session = sessions.authenticate(accessToken);
      if (request.method === "GET" && url.pathname === "/notes") {
        if (!session || !hasCapability(session.attributes, "notes.read"))
          return send(response, 401, { code: "AUTHENTICATION_REQUIRED" });
        return send(response, 200, { notes: store.list() });
      }
      if (request.method === "POST" && url.pathname === "/notes") {
        if (!session)
          return send(response, 401, { code: "AUTHENTICATION_REQUIRED" });
        if (!hasCapability(session.attributes, "notes.write"))
          return send(response, 403, { code: "FORBIDDEN" });
        try {
          sessions.verifyCsrf(accessToken, request.headers["x-csrf-token"]);
        } catch {
          return send(response, 403, { code: "CSRF_INVALID" });
        }
        const note = store.save({
          id: randomUUID(),
          createdAt: new Date().toISOString(),
        });
        const delivery = await notificationService.create({
          recipientId: session.subjectId,
          type: "note.created",
          category: "notes",
          title: "Note created",
          body: note.id,
          priority: "normal",
        });
        return send(response, 201, { note, deliveries: delivery.deliveries });
      }
      if (request.method === "GET" && url.pathname === "/notifications") {
        if (!session)
          return send(response, 401, { code: "AUTHENTICATION_REQUIRED" });
        return send(response, 200, {
          notifications: await notificationRepository.list(session.subjectId),
        });
      }
      if (request.method === "DELETE" && url.pathname === "/sessions/current") {
        try {
          sessions.verifyCsrf(accessToken, request.headers["x-csrf-token"]);
        } catch {
          return send(response, 403, { code: "CSRF_INVALID" });
        }
        sessions.revoke(accessToken);
        return send(response, 200, { revoked: true });
      }
      return send(response, 404, { code: "NOT_FOUND" });
    } catch (error) {
      return send(response, 503, { code: "NOT_READY", message: error.message });
    }
  });

  return {
    server,
    registry,
    store,
    sessions,
    realtime,
    notificationRepository,
    adapters,
    migrations,
  };
}

module.exports = { NOTES_MODULE, createApp };
