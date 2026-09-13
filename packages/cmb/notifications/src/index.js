"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const NOTIFICATIONS_MODULE = defineModule({ id: "notifications", version: "0.1.0", kind: "platform", dependencies: ["kernel"] });
class InvalidCursorError extends Error { constructor() { super("Invalid notification cursor."); this.name = "InvalidCursorError"; } }
function normalizePageLimit(value, fallback = 20, maximum = 100) { return Math.min(Math.max(Number(value) || fallback, 1), maximum); }
function encodeCursor(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function decodeCursor(value) { try { const decoded = JSON.parse(Buffer.from(value, "base64url").toString()); if (!decoded || typeof decoded !== "object" || !decoded.createdAt || !decoded.id) throw new Error(); return decoded; } catch { throw new InvalidCursorError(); } }
function projectNotification(n) { return { id: n.id, type: n.type, category: n.category, title: n.title, body: n.body, message: n.body, url: n.url || null, data: n.data || null, priority: n.priority, isRead: Boolean(n.readAt), readAt: n.readAt || null, createdAt: n.createdAt, expiresAt: n.expiresAt || null }; }
module.exports = { NOTIFICATIONS_MODULE, InvalidCursorError, normalizePageLimit, encodeCursor, decodeCursor, projectNotification };
