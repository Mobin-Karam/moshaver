import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const started = Date.now();
    const requestId = request.headers["x-request-id"] || crypto.randomUUID();
    request.requestId = requestId;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(JSON.stringify({ requestId, method: request.method, path: request.url, durationMs: Date.now() - started })),
        error: (error) => this.logger.error(JSON.stringify({ requestId, method: request.method, path: request.url, durationMs: Date.now() - started, error: error?.message })),
      }),
    );
  }
}
