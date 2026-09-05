import { RealtimeService } from "../src/modules/realtime/realtime.service";

describe("RealtimeService", () => {
  it("isolates events by authenticated user and cleans up subscriptions", () => {
    const service = new RealtimeService();
    const receivedA: unknown[] = [];
    const receivedB: unknown[] = [];
    const subscriptionA = service.stream("user-a").subscribe((event) => receivedA.push(event));
    const subscriptionB = service.stream("user-b").subscribe((event) => receivedB.push(event));
    service.emitToUser("user-a", "notification", { id: "n1" });
    expect(receivedA).toEqual([{ type: "notification", data: { id: "n1" } }]);
    expect(receivedB).toEqual([]);
    expect(service.connectionCount()).toBe(2);
    subscriptionA.unsubscribe();
    subscriptionB.unsubscribe();
    expect(service.connectionCount()).toBe(0);
  });
});
