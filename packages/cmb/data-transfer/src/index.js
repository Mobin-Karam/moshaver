"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const DATA_TRANSFER_MODULE = defineModule({ id: "data-transfer", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
const DEFAULT_FORBIDDEN_FIELDS = Object.freeze(["role", "roles", "permissions", "capabilities", "passwordHash", "sessions", "csrf"]);
function containsForbiddenFields(payload, fields = DEFAULT_FORBIDDEN_FIELDS) { const serialized = JSON.stringify(payload); const escaped = fields.map((field) => String(field).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); return new RegExp(`"(?:${escaped.join("|")})"\\s*:`, "i").test(serialized); }
function nonNegativeNumber(value) { return Math.max(0, Number(value) || 0); }
function positiveNumber(value, fallback = 1) { return Math.max(1, Number(value) || fallback); }
function summarizeCollections(collections) { return Object.fromEntries(Object.entries(collections).map(([name, values]) => [name, Array.isArray(values) ? values.length : Number(values) || 0])); }
module.exports = { DATA_TRANSFER_MODULE, DEFAULT_FORBIDDEN_FIELDS, containsForbiddenFields, nonNegativeNumber, positiveNumber, summarizeCollections };
