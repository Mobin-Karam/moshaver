import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import {
  InMemoryRealtimeHub,
  type RealtimeEvent as CmbRealtimeEvent,
} from "@moshaver/cmb-realtime";

export type RealtimeEventType =
  | "message"
  | "notification.created"
  | "plan.updated"
  | "exam.created"
  | "system.update"
  | "chat.message.created";

export type RealtimeEvent = CmbRealtimeEvent<RealtimeEventType>;

@Injectable()
export class RealtimeService {
  private readonly hub = new InMemoryRealtimeHub<RealtimeEventType>();

  stream(userId: string): Observable<RealtimeEvent> {
    return new Observable((subscriber) => {
      const unsubscribe = this.hub.subscribe(userId, (event) => subscriber.next(event));
      return unsubscribe;
    });
  }

  emitToUser(userId: string, type: RealtimeEventType, data: unknown) {
    this.hub.emitToUser(userId, type, data);
  }

  emitToUsers(userIds: Iterable<string>, type: RealtimeEventType, data: unknown) {
    this.hub.emitToUsers(userIds, type, data);
  }

  connectionCount(userId?: string) {
    return this.hub.connectionCount(userId);
  }
}
