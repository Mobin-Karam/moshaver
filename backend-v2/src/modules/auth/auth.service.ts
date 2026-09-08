import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Not, Repository } from "typeorm";
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

    const token = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + this.config.get<number>("sessionTtlHours", 168) * 60 * 60 * 1000);
    const session = await this.sessions.save(this.sessions.create({ user, tokenHash: this.hash(token), csrfToken, expiresAt }));
    await this.throttle?.success(ip, normalizedUsername);
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    return { token, csrfToken, expiresAt, session, user };
  }

  async userFromToken(token?: string, requestedRole?: string, requestedOrganizationId?: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;
    const session = await this.sessions.findOne({ where: { tokenHash: this.hash(token) }, relations: { user: true } });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    if (session.user.status && session.user.status !== UserStatus.ACTIVE) return null;
    const base = { id: session.user.id, username: session.user.username, role: session.user.role, sessionId: session.id };
    return this.authorization ? this.authorization.enrich(base, requestedRole, requestedOrganizationId) : { ...base, roles: [session.user.role], capabilities: [], membershipIds: [], organizationIds: [] };
  }

  async logout(token?: string) {
    if (token) await this.sessions.delete({ tokenHash: this.hash(token) });
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
    return sessions.map((session) => ({ id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, current: session.id === user.sessionId }));
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
    const expected = Buffer.from(session.csrfToken);
    const received = Buffer.from(csrfToken);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  private hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
