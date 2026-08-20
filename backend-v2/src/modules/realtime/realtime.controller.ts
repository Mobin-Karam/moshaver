import { Controller, Sse } from "@nestjs/common";
import { map, merge, Observable, of } from "rxjs";
import { RealtimeService } from "./realtime.service";

@Controller("events")
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse()
  events(): Observable<MessageEvent> {
    return merge(of({ type: "system.update", data: { status: "connected" } }), this.realtime.stream()).pipe(
      map((event) => ({ type: event.type, data: event.data }) as MessageEvent),
    );
  }
}
