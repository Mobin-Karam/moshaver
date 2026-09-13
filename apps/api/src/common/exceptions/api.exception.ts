import { HttpException, HttpStatus } from "@nestjs/common";

export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details: unknown = null) {
    super({ ok: false, error: { code, message, details } }, status);
  }
}
