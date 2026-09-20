"use strict";
const { defineModule } = require("@moshaver/cmb-kernel");
const NOTIFICATIONS_MODULE = defineModule({ id: "notifications", version: "0.1.0", kind: "platform", dependencies: ["kernel"], optionalDependencies: ["realtime"], provides: ["notifications.service"], publishes: ["notification.created"] });
class InvalidCursorError extends Error { constructor() { super("Invalid notification cursor."); this.name = "InvalidCursorError"; } }
function normalizePageLimit(value, fallback = 20, maximum = 100) { return Math.min(Math.max(Number(value) || fallback, 1), maximum); }
function encodeCursor(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function decodeCursor(value) { try { const decoded = JSON.parse(Buffer.from(value, "base64url").toString()); if (!decoded || typeof decoded !== "object" || !decoded.createdAt || !decoded.id) throw new Error(); return decoded; } catch { throw new InvalidCursorError(); } }
function projectNotification(n) { return { id: n.id, type: n.type, category: n.category, title: n.title, body: n.body, message: n.body, url: n.url || null, data: n.data || null, priority: n.priority, isRead: Boolean(n.readAt), readAt: n.readAt || null, createdAt: n.createdAt, expiresAt: n.expiresAt || null }; }
class InMemoryNotificationRepository {
  constructor() { this.notifications = []; }
  async save(notification) { const stored = Object.freeze({ ...notification }); this.notifications.push(stored); return stored; }
  async list(recipientId) { return this.notifications.filter((item) => !recipientId || item.recipientId === recipientId); }
}
class NotificationService {
  constructor(options = {}) {
    if (!options.repository || typeof options.repository.save !== "function") throw new TypeError("Notification repository with save() is required.");
    this.repository = options.repository;
    this.providers = Array.from(options.providers ?? []);
    this.events = options.events ?? { publish: async () => undefined };
    this.clock = options.clock ?? (() => new Date());
    this.id = options.id ?? (() => require("node:crypto").randomUUID());
    for (const provider of this.providers) if (!provider?.id || typeof provider.deliver !== "function") throw new TypeError("Notification providers require id and deliver().");
  }
  async create(input) {
    const notification = await this.repository.save({ id: this.id(), ...input, createdAt: input.createdAt ?? this.clock(), readAt: null });
    await this.events.publish({ type: "notification.created", data: notification });
    const deliveries = [];
    for (const provider of this.providers) {
      try { await provider.deliver(notification); deliveries.push({ provider: provider.id, status: "delivered" }); }
      catch (error) { deliveries.push({ provider: provider.id, status: "failed", error: error instanceof Error ? error.message : "Delivery failed" }); }
    }
    return { notification, deliveries };
  }
}
module.exports = { NOTIFICATIONS_MODULE, InvalidCursorError, normalizePageLimit, encodeCursor, decodeCursor, projectNotification, InMemoryNotificationRepository, NotificationService };
