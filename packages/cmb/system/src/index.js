"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const SYSTEM_MODULE = defineModule({ id: "system", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z_.-]+)?$/;
function isValidAppVersion(value) { return APP_VERSION_PATTERN.test(String(value ?? "")); }
function projectAuditRecord(record) { return { id: record.id, action: record.action, entity: record.entity, actorUserId: record.actorUserId ?? null, metadata: record.metadata ?? null, createdAt: record.createdAt }; }
module.exports = { SYSTEM_MODULE, APP_VERSION_PATTERN, isValidAppVersion, projectAuditRecord };
