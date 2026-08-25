"use strict";

var createAuthService = require("../services/auth.service");
var createAuthValidation = require("../validation/auth.validation");

function sendResult(res, ok, fail, result) {
  if (result && result.error) {
    return fail(
      res,
      result.error.status,
      result.error.code,
      result.error.message,
      result.error.details,
    );
  }
  ok(res, result ? result.data : null);
}

function registerAuthRoutes(router, deps) {
  var ok = deps.ok;
  var fail = deps.fail;
  var auth = createAuthService(deps);
  var validate = createAuthValidation(deps);

  router.add(
    "POST",
    /^\/api\/v1\/auth\/login$/,
    null,
    async function (req, res, match, body) {
      var input = validate.login(body);
      if (input.error)
        return fail(
          res,
          input.error.status,
          input.error.code,
          input.error.message,
        );
      sendResult(
        res,
        ok,
        fail,
        await auth.login(
          req,
          res,
          input.value.username,
          input.value.password,
        ),
      );
    },
  );

  router.add("POST", /^\/api\/v1\/auth\/logout$/, null, function (req, res) {
    ok(res, auth.logout(req, res));
  });

  router.add(
    "GET",
    /^\/api\/v1\/auth\/me$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      ok(res, auth.me(user));
    },
  );

  router.add(
    "POST",
    /^\/api\/v1\/auth\/change-password$/,
    ["admin", "student"],
    async function (req, res, match, body, user) {
      var input = validate.changePassword(body);
      if (input.error)
        return fail(
          res,
          input.error.status,
          input.error.code,
          input.error.message,
        );
      sendResult(
        res,
        ok,
        fail,
        await auth.changePassword(
          user,
          input.value.currentPassword,
          input.value.newPassword,
        ),
      );
    },
  );

  router.add(
    "GET",
    /^\/api\/v1\/auth\/sessions$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      ok(res, auth.listSessions(user));
    },
  );

  router.add(
    "DELETE",
    /^\/api\/v1\/auth\/sessions\/([^/]+)$/,
    ["admin", "student"],
    function (req, res, match, body, user) {
      sendResult(res, ok, fail, auth.revokeSession(user, match[1]));
    },
  );
}

module.exports = registerAuthRoutes;
