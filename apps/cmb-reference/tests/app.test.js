"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");
const { readConfig } = require("../src/config");

async function withServer(options, callback) {
  const app = createApp({ config: readConfig({ PORT: "0", ...options }) });
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
    assert.deepEqual(modules.modules.map((module) => module.id), ["kernel", "health", "notes"]);
  });
});

test("generic role policy and replaceable store work without education roles", async () => {
  const saved = [];
  const store = { list: () => saved, save: (note) => (saved.push(note), note) };
  const config = readConfig({ PORT: "0" });
  const app = createApp({ config, store });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  try {
    assert.equal((await fetch(`${baseUrl}/notes`, { method: "POST" })).status, 403);
    assert.equal((await fetch(`${baseUrl}/notes`, { method: "POST", headers: { "x-role": "OPERATOR" } })).status, 201);
    assert.equal(saved.length, 1);
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
  }
});

test("invalid configuration and disabled required modules fail fast", async () => {
  assert.throws(() => readConfig({ PORT: "invalid" }), /PORT/);
  assert.throws(() => createApp({ config: readConfig({ PORT: "0", DISABLED_MODULES: "health" }) }), /disabled dependency: health/);
});
