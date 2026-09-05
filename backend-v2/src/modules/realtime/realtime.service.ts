import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";

export type RealtimeEvent = {
  type: "message" | "notification" | "plan.updated" | "exam.created" | "system.update" | "chat.message";
  data: unknown;
};

@Injectable()
export class RealtimeService {
  private readonly connections = new Map<string, Set<Subject<RealtimeEvent>>>();

  stream(userId: string): Observable<RealtimeEvent> {
    return new Observable((subscriber) => {
      const subject = new Subject<RealtimeEvent>();
      const set = this.connections.get(userId) ?? new Set();
      set.add(subject);
      this.connections.set(userId, set);
      const subscription = subject.subscribe(subscriber);
      return () => { subscription.unsubscribe(); subject.complete(); set.delete(subject); if (!set.size) this.connections.delete(userId); };
    });
  }

  emitToUser(userId: string, type: RealtimeEvent["type"], data: unknown) {
    for (const connection of this.connections.get(userId) ?? []) connection.next({ type, data });
  }
  emitToUsers(userIds: Iterable<string>, type: RealtimeEvent["type"], data: unknown) { for (const userId of new Set(userIds)) this.emitToUser(userId, type, data); }
  connectionCount(userId?: string) { return userId ? (this.connections.get(userId)?.size ?? 0) : [...this.connections.values()].reduce((sum, set) => sum + set.size, 0); }
}
