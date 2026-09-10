import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, Not, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Session } from "../../database/entities/session.entity";
import { User } from "../../database/entities/user.entity";
import { Student } from "../../database/entities/student.entity";
import { UserStatus } from "../../database/entities/user.entity";
import { AuthorizationService } from "../authorization/authorization.service";
import { MembershipStatus, OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { LoginThrottleService } from "./login-throttle.service";

export type AuthenticatedUser = {
  id: string;
  username: string;
  role: string;
  sessionId: string;
  roles?: string[];
  capabilities?: string[];
  membershipIds?: string[];
  organizationIds?: string[];
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly config: ConfigService,
    @Optional() @InjectRepository(OrganizationMembership) private readonly memberships?: Repository<OrganizationMembership>,
    @Optional() private readonly authorization?: AuthorizationService,
    @Optional() private readonly throttle?: LoginThrottleService,
  ) {}

  async login(username: string, password: string, ip = "unknown") {
    const normalizedUsername = username.trim().toLowerCase();
    await this.throttle?.assertAllowed(ip, normalizedUsername);
    const user = await this.users.findOne({ where: { username: normalizedUsername } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      await this.throttle?.failure(ip, normalizedUsername);
      throw new ApiException(401, "UNAUTHORIZED", "نام کاربری یا رمز عبور نادرست است.");
    }
    if (user.status && user.status !== UserStatus.ACTIVE) throw new ApiException(403, "ACCOUNT_INACTIVE", "حساب کاربری غیرفعال یا بایگانی شده است.");
    if (user.role === "STUDENT") {
      const student = await this.students.findOne({ where: { user: { id: user.id } } });
      if (!student || student.accountStatus !== "active")
        throw new ApiException(403, "ACCOUNT_INACTIVE", "حساب دانش‌آموز غیرفعال یا بایگانی شده است.");
    }

    const credentials = this.newCredentials();
    const session = await this.sessions.save(this.sessions.create({
      user,
      tokenHash: this.hash(credentials.accessToken),
      refreshTokenHash: this.hash(credentials.refreshToken),
      csrfToken: credentials.csrfToken,
      expiresAt: credentials.expiresAt,
      refreshExpiresAt: credentials.refreshExpiresAt,
    }));
    await this.throttle?.success(ip, normalizedUsername);
    const now = new Date();
    await this.sessions.delete([
      { refreshExpiresAt: LessThan(now) },
      { refreshExpiresAt: IsNull(), expiresAt: LessThan(now) },
    ]);
    return { ...credentials, session, user };
  }

  async refresh(refreshToken?: string, csrfToken?: string) {
    if (!refreshToken || !csrfToken) throw new ApiException(401, "REFRESH_REQUIRED", "نشست شما منقضی شده است. دوباره وارد شوید.");
    const session = await this.sessions.findOne({ where: { refreshTokenHash: this.hash(refreshToken) }, relations: { user: true } });
    if (!session || !session.refreshExpiresAt || session.refreshExpiresAt.getTime() <= Date.now()) {
      throw new ApiException(401, "REFRESH_EXPIRED", "نشست شما منقضی شده است. دوباره وارد شوید.");
    }
    if (!this.safeEqual(session.csrfToken, csrfToken)) throw new ApiException(403, "CSRF", "نشست امنیتی نامعتبر است.");
    if (session.user.status && session.user.status !== UserStatus.ACTIVE) {
      await this.sessions.delete({ id: session.id });
      throw new ApiException(403, "ACCOUNT_INACTIVE", "حساب کاربری غیرفعال یا بایگانی شده است.");
    }
    const credentials = this.newCredentials();
    session.tokenHash = this.hash(credentials.accessToken);
    session.refreshTokenHash = this.hash(credentials.refreshToken);
    session.csrfToken = credentials.csrfToken;
    session.expiresAt = credentials.expiresAt;
    session.refreshExpiresAt = credentials.refreshExpiresAt;
    await this.sessions.save(session);
    return { ...credentials, session, user: session.user };
  }

  async userFromToken(token?: string, requestedRole?: string, requestedOrganizationId?: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;
    const session = await this.sessions.findOne({ where: { tokenHash: this.hash(token) }, relations: { user: true } });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    if (session.user.status && session.user.status !== UserStatus.ACTIVE) return null;
    const base = { id: session.user.id, username: session.user.username, role: session.user.role, sessionId: session.id };
    return this.authorization ? this.authorization.enrich(base, requestedRole, requestedOrganizationId) : { ...base, roles: [session.user.role], capabilities: [], membershipIds: [], organizationIds: [] };
  }

  async logout(token?: string, refreshToken?: string) {
    const where = [
      ...(token ? [{ tokenHash: this.hash(token) }] : []),
      ...(refreshToken ? [{ refreshTokenHash: this.hash(refreshToken) }] : []),
    ];
    if (where.length) await this.sessions.delete(where);
  }

  async me(user: AuthenticatedUser) {
    const session = await this.sessions.findOne({ where: { id: user.sessionId } });
    return { id: user.id, username: user.username, role: user.role, roles: user.roles, capabilities: user.capabilities, csrfToken: session?.csrfToken };
  }

  async context(user: AuthenticatedUser, activeOrganizationId?: string) {
    const organizationIds = user.organizationIds ?? [];
    const roles = user.roles ?? (user.role === "ADMIN" ? [] : [user.role]);
    if (activeOrganizationId && !organizationIds.includes(activeOrganizationId) && !roles.includes("PLATFORM_ADMIN")) throw new ApiException(403, "ORGANIZATION_FORBIDDEN", "به این سازمان دسترسی ندارید.");
    const account = await this.users.findOne({ where: { id: user.id } });
    if (!this.authorization || !this.memberships) throw new ApiException(503, "CONTEXT_UNAVAILABLE", "اطلاعات دسترسی در دسترس نیست.");
    const assignments = await this.authorization.enrich(user as Required<AuthenticatedUser>);
    const memberships = await this.memberships.find({ where: { user: { id: user.id }, status: MembershipStatus.ACTIVE }, relations: { organization: true } });
    const organizations = memberships.map((membership) => ({ membershipId: membership.id, id: membership.organization.id, name: membership.organization.name, type: membership.organization.type }));
    const workContexts = await Promise.all(assignments.roles.map(async (role) => {
      const scoped = await this.authorization!.enrich(user as Required<AuthenticatedUser>, role);
      return { role, capabilities: scoped.capabilities };
    }));
    return {
      user: { id: account!.id, username: account!.username, firstName: account!.firstName, lastName: account!.lastName, status: account!.status, locale: account!.locale, timezone: account!.timezone },
      roles: assignments.roles,
      capabilities: assignments.capabilities,
      workContexts,
      memberships: organizations,
      activeOrganization: organizations.find((item) => item.id === activeOrganizationId) ?? (organizations.length === 1 ? organizations[0] : null),
      availableOrganizations: organizations,
    };
  }

  async changePassword(user: AuthenticatedUser, currentPassword: string, newPassword: string) {
    const account = await this.users.findOne({ where: { id: user.id } });
    if (!account || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      throw new ApiException(401, "INVALID_CREDENTIALS", "رمز فعلی درست نیست.");
    }

    account.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(account);
    await this.sessions.delete({ user: { id: user.id }, id: Not(user.sessionId) });
    return { changed: true, otherSessionsRevoked: true };
  }

  async listSessions(user: AuthenticatedUser) {
    const sessions = await this.sessions.find({ where: { user: { id: user.id } }, order: { createdAt: "DESC" } });
    return sessions.map((session) => ({ id: session.id, createdAt: session.createdAt, expiresAt: session.refreshExpiresAt ?? session.expiresAt, current: session.id === user.sessionId }));
  }

  async revokeSession(user: AuthenticatedUser, id: string) {
    if (id === user.sessionId) {
      throw new ApiException(400, "CURRENT_SESSION", "برای خروج از نشست فعلی از دکمه خروج استفاده کنید.");
    }
    const result = await this.sessions.delete({ id, user: { id: user.id } });
    return { id, revoked: Boolean(result.affected) };
  }

  async verifyCsrf(sessionId: string, csrfToken: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) return false;
    return this.safeEqual(session.csrfToken, csrfToken);
  }

  private newCredentials() {
    const now = Date.now();
    return {
      accessToken: crypto.randomBytes(32).toString("base64url"),
      refreshToken: crypto.randomBytes(48).toString("base64url"),
      csrfToken: crypto.randomBytes(24).toString("base64url"),
      expiresAt: new Date(now + this.config.get<number>("accessTokenTtlMinutes", 15) * 60 * 1000),
      refreshExpiresAt: new Date(now + this.config.get<number>("refreshTokenTtlDays", 30) * 24 * 60 * 60 * 1000),
    };
  }

  private safeEqual(expectedValue: string, receivedValue: string) {
    const expected = Buffer.from(expectedValue);
    const received = Buffer.from(receivedValue);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  private hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
