"use strict";
const test = require("node:test"); const assert = require("node:assert/strict"); const { normalizePageLimit, encodeCursor, decodeCursor, projectNotification, InMemoryNotificationRepository, NotificationService } = require("../src");
test("bounds page sizes", () => { assert.equal(normalizePageLimit(undefined), 20); assert.equal(normalizePageLimit(-5), 1); assert.equal(normalizePageLimit(500), 100); });
test("round trips opaque cursors and rejects malformed input", () => { const cursor = encodeCursor({ createdAt: "2026-09-13", id: "n1" }); assert.deepEqual(decodeCursor(cursor), { createdAt: "2026-09-13", id: "n1" }); assert.throws(() => decodeCursor("bad"), { name: "InvalidCursorError" }); });
test("projects stable public notification state", () => { const createdAt = new Date(); assert.deepEqual(projectNotification({ id: "n1", type: "message", category: "general", title: "Title", body: "Body", priority: "normal", readAt: null, createdAt }), { id: "n1", type: "message", category: "general", title: "Title", body: "Body", message: "Body", url: null, data: null, priority: "normal", isRead: false, readAt: null, createdAt, expiresAt: null }); });
test("persists durable notification state before isolating provider failure", async () => {
  const repository = new InMemoryNotificationRepository();
  const events = [];
  const service = new NotificationService({ repository, id: () => "n1", clock: () => new Date("2026-09-20T00:00:00Z"), events: { publish: async (event) => events.push(event) }, providers: [{ id: "broken", deliver: async () => { throw new Error("offline"); } }] });
  const result = await service.create({ recipientId: "viewer", type: "note", category: "general", title: "Saved", body: "Body", priority: "normal" });
  assert.equal((await repository.list("viewer")).length, 1);
  assert.equal(events[0].type, "notification.created");
  assert.deepEqual(result.deliveries, [{ provider: "broken", status: "failed", error: "offline" }]);
});
