"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const ACTIVITY_MODULE = defineModule({ id: "activity", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
const DEFAULT_PRESENCE_STATES = Object.freeze(["idle", "studying", "quiz", "exam", "offline"]);
function normalizePresenceState(value, allowedStates = DEFAULT_PRESENCE_STATES, fallback = "idle") { const state = String(value ?? ""); return allowedStates.includes(state) ? state : fallback; }
function shouldPersistPresence(previous, next, now = new Date(), debounceMs = 30_000) { if (!previous) return true; return previous.state !== next.state || (previous.resourceId ?? null) !== (next.resourceId ?? null) || now.getTime() - previous.lastSeenAt.getTime() >= debounceMs; }
function projectPresence(row, now = new Date(), onlineWindowMs = 90_000) { const online = now.getTime() - row.lastSeenAt.getTime() <= onlineWindowMs; return { online, state: online ? row.state : "offline", lastSeenAt: row.lastSeenAt, currentTask: row.resource ? { id: row.resource.id, title: row.resource.title } : null }; }
function clampActivityLimit(value, fallback = 50, maximum = 100) { return Math.min(Math.max(Number(value) || fallback, 1), maximum); }
module.exports = { ACTIVITY_MODULE, DEFAULT_PRESENCE_STATES, normalizePresenceState, shouldPersistPresence, projectPresence, clampActivityLimit };
