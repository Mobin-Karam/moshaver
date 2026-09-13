"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const IDENTITY_MODULE = defineModule({ id: "identity", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
function normalizeUsername(value) {
  const username = String(value ?? "").trim().toLowerCase();
  if (!username) throw new TypeError("Username is required.");
  return username;
}
function uniqueValues(values) {
  return [...new Set(Array.from(values ?? [], (value) => String(value).trim()).filter(Boolean))];
}
function projectCapabilities(assignments) {
  return uniqueValues(Array.from(assignments ?? []).flatMap((assignment) => assignment?.capabilities ?? []));
}
module.exports = { IDENTITY_MODULE, normalizeUsername, uniqueValues, projectCapabilities };
