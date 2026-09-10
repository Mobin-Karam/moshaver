import crypto from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { SignupThrottle } from "../../database/entities/signup-throttle.entity";

@Injectable()
export class SignupThrottleService {
  private queue: Promise<void> = Promise.resolve();
  constructor(@InjectRepository(SignupThrottle) private repo: Repository<SignupThrottle>, private config: ConfigService) {}

  record(ip: string) {
    const operation = this.queue.then(() => this.recordAttempt(ip));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async recordAttempt(ip: string) {
    const now = new Date();
    const windowMs = this.config.get<number>("signupWindowMs", 60 * 60_000);
    const max = this.config.get<number>("signupMaxAttempts", 5);
    const key = crypto.createHash("sha256").update(ip).digest("hex");
    if (typeof this.repo.query === "function") {
      const timestamp = now.toISOString();
      const windowStart = new Date(now.getTime() - windowMs).toISOString();
      const [row] = await this.repo.query(
        `INSERT INTO signup_throttles (id, "key", attempts, windowStartedAt, updatedAt)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT("key") DO UPDATE SET
           attempts = CASE WHEN julianday(windowStartedAt) <= julianday(?) THEN 1 ELSE attempts + 1 END,
           windowStartedAt = CASE WHEN julianday(windowStartedAt) <= julianday(?) THEN excluded.windowStartedAt ELSE windowStartedAt END,
           updatedAt = excluded.updatedAt
         RETURNING attempts`,
        [crypto.randomUUID(), key, timestamp, timestamp, windowStart, windowStart],
      );
      if (Number(row?.attempts || 0) > max) throw new ApiException(429, "SIGNUP_THROTTLED", "تعداد تلاش‌های ثبت‌نام زیاد است. کمی بعد دوباره تلاش کنید.");
      return;
    }
    let row = await this.repo.findOne({ where: { key } });
    if (!row || now.getTime() - row.windowStartedAt.getTime() >= windowMs) row = this.repo.create({ key, attempts: 0, windowStartedAt: now });
    if (row.attempts >= max) throw new ApiException(429, "SIGNUP_THROTTLED", "تعداد تلاش‌های ثبت‌نام زیاد است. کمی بعد دوباره تلاش کنید.");
    row.attempts += 1;
    await this.repo.save(row);
  }
}
