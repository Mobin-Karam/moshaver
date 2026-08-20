import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyReply } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;

    if (typeof payload === "object" && payload && "ok" in payload) {
      response.status(status).send(payload);
      return;
    }

    response.status(status).send({
      ok: false,
      error: {
        code: status === 500 ? "INTERNAL_ERROR" : "HTTP_ERROR",
        message: status === 500 ? "خطای سرور" : "درخواست نامعتبر است.",
        details: status === 500 ? null : payload,
      },
    });
  }
}
