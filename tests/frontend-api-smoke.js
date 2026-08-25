"use strict";
var fs = require("fs"),
  vm = require("vm"),
  path = require("path");
var appRoot = path.resolve(__dirname, "../v1.4");
function assert(ok, msg) {
  if (!ok) throw new Error(msg);
}
function runApi(file, key) {
  var storage = {};
  var sessionStorage = {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(storage, k)
        ? storage[k]
        : null;
    },
    setItem: function (k, v) {
      storage[k] = String(v);
    },
    removeItem: function (k) {
      delete storage[k];
    },
  };
  var calls = [];
  var responses = [
    {
      status: 403,
      body: { ok: false, error: { code: "CSRF", message: "bad csrf" } },
    },
    {
      status: 200,
      body: {
        ok: true,
        data: {
          id: "u",
          role: key.indexOf("admin") >= 0 ? "admin" : "student",
          csrfToken: "fresh-token",
        },
      },
    },
    { status: 201, body: { ok: true, data: { id: "created" } } },
  ];
  function XHR() {
    this.headers = {};
    this.readyState = 0;
    this.status = 0;
    this.responseText = "";
  }
  XHR.prototype.open = function (method, url) {
    this.method = method;
    this.url = url;
  };
  XHR.prototype.setRequestHeader = function (k, v) {
    this.headers[k] = v;
  };
  XHR.prototype.send = function (body) {
    var self = this,
      r = responses.shift();
    calls.push({
      method: this.method,
      url: this.url,
      headers: Object.assign({}, this.headers),
      body: body,
    });
    setTimeout(function () {
      self.status = r.status;
      self.responseText = JSON.stringify(r.body);
      self.readyState = 4;
      if (self.onreadystatechange) self.onreadystatechange();
    }, 0);
  };
  XHR.prototype.abort = function () {
    if (this.onabort) this.onabort();
  };
  var sandbox = {
    window: null,
    sessionStorage: sessionStorage,
    XMLHttpRequest: XHR,
    EventSource: function () {},
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  sandbox.window = sandbox;
  sandbox.APP_CONFIG = { API_BASE_URL: "/api/v1" };
  var shared = path.join(path.dirname(file), "api-client.shared.js");
  vm.runInNewContext(fs.readFileSync(shared, "utf8"), sandbox, { filename: shared });
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, {
    filename: file,
  });
  sandbox.API.setCsrf("old-token");
  return new Promise(function (resolve, reject) {
    sandbox.API.request(
      "POST",
      "/activity",
      { eventType: "task.opened" },
      function (err, data, status) {
        try {
          assert(!err, "mutation should recover after CSRF refresh");
          assert(
            status === 201 && data.id === "created",
            "retried mutation response",
          );
          assert(
            calls.length === 3,
            "expected mutation -> auth/me -> mutation",
          );
          assert(
            calls[0].headers["X-CSRF-Token"] === "old-token",
            "first mutation old token",
          );
          assert(
            calls[1].method === "GET" && calls[1].url === "/api/v1/auth/me",
            "refresh auth/me",
          );
          assert(
            calls[2].headers["X-CSRF-Token"] === "fresh-token",
            "retry fresh token",
          );
          assert(sandbox.API.csrf() === "fresh-token", "stored refreshed csrf");
          resolve();
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}
(async function () {
  await runApi(path.join(appRoot, "student-app/js/api.js"), "student");
  await runApi(path.join(appRoot, "admin-app/js/api.js"), "admin");
  var admin = fs.readFileSync(
    path.join(appRoot, "admin-app/js/admin.js"),
    "utf8",
  );
  assert(
    /DOMContentLoaded["'],\s*init/.test(admin) && /else\s+init\(\)/.test(admin),
    "admin init must execute",
  );
  var update = fs.readFileSync(
    path.join(appRoot, "admin-app/js/update.js"),
    "utf8",
  );
  assert(
    update.indexOf("updateNotes').innerHTML") < 0,
    "update notes must not use innerHTML",
  );
  console.log(
    "FRONTEND API SMOKE PASSED: CSRF refresh/retry, Admin init, safe update notes",
  );
})().catch(function (e) {
  console.error("FRONTEND API SMOKE FAILED:", e.stack || e);
  process.exit(1);
});
