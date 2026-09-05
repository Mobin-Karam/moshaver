import crypto from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { LoginThrottle } from "../../database/entities/login-throttle.entity";

@Injectable()
export class LoginThrottleService {
  constructor(@InjectRepository(LoginThrottle) private repo: Repository<LoginThrottle>, private config: ConfigService) {}
  private keys(ip: string, identifier: string) { const normalized = identifier.trim().toLowerCase(); const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex"); return [`ip:${hash(ip)}`, `id:${hash(normalized)}`, `pair:${hash(`${ip}\0${normalized}`)}`]; }
  async assertAllowed(ip: string, identifier: string) { const now = new Date(); const rows = await this.repo.find({ where: { key: In(this.keys(ip, identifier)) } }); if (rows.some((row) => row.lockedUntil && row.lockedUntil > now)) throw new ApiException(429, "LOGIN_THROTTLED", "ورود موقتاً امکان‌پذیر نیست. کمی بعد دوباره تلاش کنید."); }
  async failure(ip: string, identifier: string) { const now = new Date(); const windowMs = this.config.get<number>("loginAttemptWindowMs", 15 * 60_000); const lockMs = this.config.get<number>("loginLockMs", 15 * 60_000); const max = this.config.get<number>("loginMaxAttempts", 8); for (const key of this.keys(ip, identifier)) { let row = await this.repo.findOne({ where: { key } }); if (!row || now.getTime() - row.windowStartedAt.getTime() > windowMs) row = this.repo.create({ key, attempts: 0, windowStartedAt: now, lockedUntil: null }); row.attempts += 1; if (row.attempts >= max) row.lockedUntil = new Date(now.getTime() + lockMs); await this.repo.save(row); } }
  async success(ip: string, identifier: string) { await this.repo.delete({ key: In(this.keys(ip, identifier).slice(1)) }); }
}
