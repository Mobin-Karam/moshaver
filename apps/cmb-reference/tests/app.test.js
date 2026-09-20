"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");
const { readConfig } = require("../src/config");

async function withServer(options, callback) {
  const app = createApp({ config: readConfig({ PORT: "0", ...options.environment }), ...options.app });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const address = app.server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`, app);
  } finally {
    await new Promise((resolve, reject) => app.server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("boots with health, readiness, and module metadata", async () => {
  await withServer({}, async (baseUrl) => {
    assert.deepEqual(await (await fetch(`${baseUrl}/health`)).json(), { service: "cmb-reference", status: "ok" });
    assert.equal((await fetch(`${baseUrl}/ready`)).status, 200);
    const modules = await (await fetch(`${baseUrl}/modules`)).json();
    assert.deepEqual(modules.modules.map((module) => module.id), ["kernel", "health", "infrastructure", "persistence", "identity", "tenancy", "auth", "authorization", "notifications", "realtime", "notes"]);
    assert.deepEqual(modules.migrations, ["notes:20260920000100:create-notes"]);
    const adapters = await (await fetch(`${baseUrl}/adapters`)).json();
    assert.deepEqual(adapters.adapters.map((adapter) => adapter.port), ["notes.store", "notifications.repository"]);
  });
});

async function login(baseUrl, username) {
  const response = await fetch(`${baseUrl}/sessions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username }) });
  const payload = await response.json();
  return { response, payload, cookie: response.headers.getSetCookie()[0].split(";")[0] };
}

test("generic capability policy, CSRF, notifications, and replaceable store work without education roles", async () => {
  const saved = [];
  const store = { list: () => saved, save: (note) => (saved.push(note), note) };
  await withServer({ app: { store, notificationProviders: [{ id: "offline", deliver: async () => { throw new Error("provider unavailable"); } }] } }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/notes`, { method: "POST" })).status, 401);
    const viewer = await login(baseUrl, "viewer");
    assert.equal((await fetch(`${baseUrl}/notes`, { method: "POST", headers: { cookie: viewer.cookie, "x-csrf-token": viewer.payload.csrfToken } })).status, 403);
    const operator = await login(baseUrl, "operator");
    assert.equal((await fetch(`${baseUrl}/notes`, { method: "POST", headers: { cookie: operator.cookie } })).status, 403);
    const created = await fetch(`${baseUrl}/notes`, { method: "POST", headers: { cookie: operator.cookie, "x-csrf-token": operator.payload.csrfToken } });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).deliveries[0].status, "failed");
    assert.equal(saved.length, 1);
    assert.equal((await (await fetch(`${baseUrl}/notifications`, { headers: { cookie: operator.cookie } })).json()).notifications.length, 1);
    assert.equal((await fetch(`${baseUrl}/sessions/current`, { method: "DELETE", headers: { cookie: operator.cookie, "x-csrf-token": operator.payload.csrfToken } })).status, 200);
    assert.equal((await fetch(`${baseUrl}/notes`, { headers: { cookie: operator.cookie } })).status, 401);
  });
});

test("invalid configuration and disabled required modules fail fast", async () => {
  assert.throws(() => readConfig({ PORT: "invalid" }), /PORT/);
  assert.throws(() => createApp({ config: readConfig({ PORT: "0", DISABLED_MODULES: "health" }) }), /disabled dependency: health/);
});
