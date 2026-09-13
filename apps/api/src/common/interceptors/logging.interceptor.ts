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
        error: (error) => {
          const status = typeof error?.getStatus === "function" ? error.getStatus() : Number(error?.status || error?.statusCode || 500);
          const entry = JSON.stringify({ requestId, method: request.method, path: request.url, status, durationMs: Date.now() - started, error: error?.message });
          if (status >= 500) this.logger.error(entry);
          else this.logger.warn(entry);
        },
      }),
    );
  }
}
