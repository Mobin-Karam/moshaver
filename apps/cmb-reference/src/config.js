"use strict";

function readConfig(environment = process.env) {
  const serviceName = String(environment.SERVICE_NAME ?? "cmb-reference").trim();
  const port = Number(environment.PORT ?? 3000);
  const disabledModules = String(environment.DISABLED_MODULES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!serviceName) throw new TypeError("SERVICE_NAME must not be empty.");
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("PORT must be an integer between 0 and 65535.");
  }
  return Object.freeze({ serviceName, port, disabledModules });
}

module.exports = { readConfig };
