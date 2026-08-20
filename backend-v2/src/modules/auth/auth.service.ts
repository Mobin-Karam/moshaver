import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Session } from "../../database/entities/session.entity";
import { User } from "../../database/entities/user.entity";

export type AuthenticatedUser = {
  id: string;
  username: string;
  role: string;
  sessionId: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiException(401, "UNAUTHORIZED", "نام کاربری یا رمز عبور نادرست است.");
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.get<number>("sessionTtlHours", 168) * 60 * 60 * 1000);
    const session = await this.sessions.save(this.sessions.create({ user, tokenHash: this.hash(token), csrfToken, expiresAt }));
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    return { token, csrfToken, expiresAt, session, user };
  }

  async userFromToken(token?: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;
    const session = await this.sessions.findOne({ where: { tokenHash: this.hash(token) }, relations: { user: true } });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    return { id: session.user.id, username: session.user.username, role: session.user.role, sessionId: session.id };
  }

  async logout(token?: string) {
    if (token) await this.sessions.delete({ tokenHash: this.hash(token) });
  }

  async me(user: AuthenticatedUser) {
    const session = await this.sessions.findOne({ where: { id: user.sessionId } });
    return { id: user.id, username: user.username, role: user.role, csrfToken: session?.csrfToken };
  }

  async listSessions(user: AuthenticatedUser) {
    const sessions = await this.sessions.find({ where: { user: { id: user.id } }, order: { createdAt: "DESC" } });
    return sessions.map((session) => ({ id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, current: session.id === user.sessionId }));
  }

  async revokeSession(user: AuthenticatedUser, id: string) {
    await this.sessions.delete({ id, user: { id: user.id } });
    return { id, revoked: true };
  }

  async verifyCsrf(sessionId: string, csrfToken: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) return false;
    const expected = Buffer.from(session.csrfToken);
    const received = Buffer.from(csrfToken);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  private hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
