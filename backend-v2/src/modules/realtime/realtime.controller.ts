import { Controller, Sse } from "@nestjs/common";
import { interval, map, merge, Observable, of } from "rxjs";
import { RealtimeService } from "./realtime.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.service";
import { ApiException } from "../../common/exceptions/api.exception";

@Controller("events")
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse()
  events(@CurrentUser() user: AuthenticatedUser | null): Observable<MessageEvent> {
    if (!user) throw new ApiException(401, "UNAUTHORIZED", "لطفاً وارد حساب شوید.");
    const heartbeat = interval(25_000).pipe(map(() => ({ type: "system.update" as const, data: { heartbeat: true } })));
    return merge(of({ type: "system.update" as const, data: { status: "connected" } }), heartbeat, this.realtime.stream(user.id)).pipe(
      map((event) => ({ type: event.type, data: event.data }) as MessageEvent),
    );
  }
}
