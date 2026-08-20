import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";

export type RealtimeEvent = {
  type: "message" | "notification" | "plan.updated" | "exam.created" | "system.update" | "chat.message";
  data: unknown;
};

@Injectable()
export class RealtimeService {
  private readonly events = new Subject<RealtimeEvent>();

  stream(): Observable<RealtimeEvent> {
    return this.events.asObservable();
  }

  publish(type: RealtimeEvent["type"], data: unknown) {
    this.events.next({ type, data });
  }
}
