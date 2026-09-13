"use strict";

const { defineModule } = require("@moshaver/cmb-kernel");

const REALTIME_MODULE = defineModule({
  id: "realtime",
  version: "0.1.0",
  kind: "platform",
  dependencies: ["kernel"],
});

class InMemoryRealtimeHub {
  constructor() {
    this.connections = new Map();
  }

  subscribe(userId, listener) {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) throw new TypeError("Realtime subscription requires a userId.");
    if (typeof listener !== "function") throw new TypeError("Realtime subscription requires a listener.");

    const listeners = this.connections.get(normalizedUserId) ?? new Set();
    listeners.add(listener);
    this.connections.set(normalizedUserId, listeners);
    let active = true;

    return () => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
      if (!listeners.size) this.connections.delete(normalizedUserId);
    };
  }

  emitToUser(userId, type, data) {
    const listeners = this.connections.get(userId);
    if (!listeners?.size) return 0;
    const event = Object.freeze({ type, data });
    for (const listener of [...listeners]) listener(event);
    return listeners.size;
  }

  emitToUsers(userIds, type, data) {
    let delivered = 0;
    for (const userId of new Set(userIds)) delivered += this.emitToUser(userId, type, data);
    return delivered;
  }

  connectionCount(userId) {
    if (userId) return this.connections.get(userId)?.size ?? 0;
    let count = 0;
    for (const listeners of this.connections.values()) count += listeners.size;
    return count;
  }
}

module.exports = {
  REALTIME_MODULE,
  InMemoryRealtimeHub,
};
