import { RealtimeEvent, RealtimeService } from "./realtime.service";

describe("RealtimeService", () => {
  it("preserves observable stream behavior over the CMB hub", () => {
    const service = new RealtimeService();
    const events: RealtimeEvent[] = [];
    const subscription = service.stream("u1").subscribe((event) => events.push(event));

    service.emitToUser("u1", "message", { id: "m1" });
    expect(events).toEqual([{ type: "message", data: { id: "m1" } }]);
    expect(service.connectionCount("u1")).toBe(1);

    subscription.unsubscribe();
    expect(service.connectionCount("u1")).toBe(0);
  });

  it("deduplicates emitToUsers recipients", () => {
    const service = new RealtimeService();
    let count = 0;
    const a = service.stream("u1").subscribe(() => { count += 1; });
    const b = service.stream("u2").subscribe(() => { count += 1; });

    service.emitToUsers(["u1", "u1", "u2"], "system.update", { heartbeat: true });
    expect(count).toBe(2);

    a.unsubscribe();
    b.unsubscribe();
  });
});
