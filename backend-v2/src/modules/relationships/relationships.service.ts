import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Organization } from "../../database/entities/organization.entity";
import {
  MembershipStatus,
  OrganizationMembership,
} from "../../database/entities/organization-membership.entity";
import { Student } from "../../database/entities/student.entity";
import {
  RelationshipStatus,
  RelationshipType,
  UserRelationship,
} from "../../database/entities/user-relationship.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { User } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CreateRelationshipDto,
  UpdateRelationshipDto,
} from "./dto/relationship.dto";

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectRepository(UserRelationship)
    private relationships: Repository<UserRelationship>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(Organization)
    private organizations: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private memberships: Repository<OrganizationMembership>,
    @InjectRepository(UserRoleAssignment)
    private assignments: Repository<UserRoleAssignment>,
    private notifications: NotificationsService,
  ) {}
  private platform(user: AuthenticatedUser) {
    return user.roles?.includes("PLATFORM_ADMIN");
  }
  private canManage(user: AuthenticatedUser, organizationId?: string | null) {
    return (
      this.platform(user) ||
      Boolean(
        organizationId &&
        user.organizationIds?.includes(organizationId) &&
        user.capabilities?.includes("organization.members.manage"),
      )
    );
  }
  async list(user: AuthenticatedUser) {
    const canManageOrganizations =
      user.capabilities?.includes("organization.members.manage") &&
      user.organizationIds?.length;
    const where = this.platform(user)
      ? {}
      : canManageOrganizations
        ? { organization: { id: In(user.organizationIds!) } }
        : { fromUser: { id: user.id } };
    return this.relationships
      .find({
        where,
        relations: { fromUser: true, toStudent: true, organization: true },
        order: { createdAt: "DESC" },
      })
      .then((items) => items.map(this.project));
  }
  async get(user: AuthenticatedUser, id: string) {
    const item = await this.relationships.findOne({
      where: { id },
      relations: { fromUser: true, toStudent: true, organization: true },
    });
    if (!item) throw new ApiException(404, "NOT_FOUND", "رابطه یافت نشد.");
    if (
      item.fromUser.id !== user.id &&
      !this.canManage(user, item.organization?.id)
    )
      throw new ApiException(404, "NOT_FOUND", "رابطه یافت نشد.");
    return this.project(item);
  }
  async create(user: AuthenticatedUser, dto: CreateRelationshipDto) {
    if (!this.canManage(user, dto.organizationId))
      throw new ApiException(403, "FORBIDDEN", "ایجاد این رابطه مجاز نیست.");
    const [fromUser, student, organization] = await Promise.all([
      this.users.findOne({ where: { id: dto.fromUserId } }),
      this.students.findOne({ where: { id: dto.toStudentId } }),
      dto.organizationId
        ? this.organizations.findOne({ where: { id: dto.organizationId } })
        : Promise.resolve(null),
    ]);
    if (!fromUser || !student || (dto.organizationId && !organization))
      throw new ApiException(
        404,
        "NOT_FOUND",
        "کاربر، دانش‌آموز یا سازمان یافت نشد.",
      );
    const existing = await this.relationships.findOne({
      where: {
        fromUser: { id: dto.fromUserId },
        toStudent: { id: dto.toStudentId },
        organization: dto.organizationId
          ? { id: dto.organizationId }
          : undefined,
        type: dto.type,
      },
    });
    if (
      existing &&
      ![RelationshipStatus.REJECTED, RelationshipStatus.REVOKED].includes(
        existing.status,
      )
    )
      throw new ApiException(
        409,
        "RELATIONSHIP_EXISTS",
        "این رابطه از قبل وجود دارد.",
      );
    const item =
      existing ??
      this.relationships.create({
        fromUser,
        toStudent: student,
        organization,
        type: dto.type,
      });
    item.status = RelationshipStatus.PENDING;
    item.acceptedAt = null;
    item.revokedAt = null;
    return this.relationships.save(item).then(this.project);
  }
  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateRelationshipDto,
  ) {
    const item = await this.relationships.findOne({
      where: { id },
      relations: {
        fromUser: true,
        toStudent: { user: true },
        organization: true,
      },
    });
    if (!item) throw new ApiException(404, "NOT_FOUND", "رابطه یافت نشد.");
    const selfDecision =
      item.fromUser.id === user.id &&
      [RelationshipStatus.ACTIVE, RelationshipStatus.REJECTED].includes(
        dto.status,
      );
    if (!selfDecision && !this.canManage(user, item.organization?.id))
      throw new ApiException(403, "FORBIDDEN", "تغییر این رابطه مجاز نیست.");
    const previousStatus = item.status;
    item.status = dto.status;
    item.acceptedAt =
      dto.status === RelationshipStatus.ACTIVE ? new Date() : item.acceptedAt;
    item.revokedAt =
      dto.status === RelationshipStatus.REVOKED ? new Date() : null;
    if (
      item.type === RelationshipType.GUARDIAN_OF &&
      previousStatus !== RelationshipStatus.ACTIVE &&
      dto.status === RelationshipStatus.ACTIVE
    ) {
      item.toStudent.guardianChangedAt = new Date();
      await this.students.save(item.toStudent);
    }
    return this.relationships.save(item).then(this.project);
  }
  remove(user: AuthenticatedUser, id: string) {
    return this.update(user, id, { status: RelationshipStatus.REVOKED });
  }
  async forStudent(user: AuthenticatedUser, studentId: string) {
    const self = await this.students.findOne({
      where: { id: studentId, user: { id: user.id } },
    });
    const allowed =
      Boolean(self) ||
      this.platform(user) ||
      Boolean(
        await this.relationships.findOne({
          where: {
            fromUser: { id: user.id },
            toStudent: { id: studentId },
            status: RelationshipStatus.ACTIVE,
          },
        }),
      );
    if (!allowed)
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یافت نشد.");
    return this.relationships
      .find({
        where: {
          toStudent: { id: studentId },
          status: RelationshipStatus.ACTIVE,
        },
        relations: { fromUser: true, organization: true },
      })
      .then((items) => items.map(this.project));
  }
  async myStudents(user: AuthenticatedUser) {
    const own = user.roles?.includes("STUDENT")
      ? await this.students.find({ where: { user: { id: user.id } } })
      : [];
    const links = await this.relationships.find({
      where: { fromUser: { id: user.id }, status: RelationshipStatus.ACTIVE },
      relations: { toStudent: true, organization: true },
    });
    return [
      ...own.map((student) => ({
        student: { id: student.id, name: student.name },
        relationship: { type: "SELF", status: "ACTIVE" },
      })),
      ...links.map((link) => ({
        student: { id: link.toStudent.id, name: link.toStudent.name },
        relationship: {
          id: link.id,
          type: link.type,
          status: link.status,
          organizationId: link.organization?.id ?? null,
        },
      })),
    ];
  }
  async guardianSelection(user: AuthenticatedUser) {
    const student = await this.selfStudent(user);
    const rows = await this.relationships.find({
      where: {
        toStudent: { id: student.id },
        type: RelationshipType.GUARDIAN_OF,
      },
      relations: { fromUser: true, toStudent: true, organization: true },
      order: { createdAt: "DESC" },
    });
    const nextAllowedAt = student.guardianChangedAt
      ? new Date(
          student.guardianChangedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        )
      : null;
    return {
      relationships: rows
        .filter((row) => row.status !== RelationshipStatus.REVOKED)
        .map(this.project),
      change: {
        allowed: !nextAllowedAt || nextAllowedAt.getTime() <= Date.now(),
        nextAllowedAt,
      },
    };
  }
  async guardianCandidates(user: AuthenticatedUser, search = "") {
    const student = await this.selfStudent(user);
    const memberships = await this.memberships.find({
      where: {
        user: { id: user.id },
        status: MembershipStatus.ACTIVE,
      },
      relations: { organization: true },
    });
    const organizationIds = memberships.map((item) => item.organization.id);
    if (!organizationIds.length) return [];
    const rows = await this.assignments.find({
      where: {
        role: { code: "GUARDIAN" },
        membership: {
          organization: { id: In(organizationIds) },
          status: MembershipStatus.ACTIVE,
        },
      },
      relations: { user: true, membership: { organization: true } },
    });
    const query = search.trim().toLowerCase();
    return [
      ...new Map(
        rows
          .filter(
            (row) =>
              row.user.id !== student.user?.id &&
              (!query ||
                `${row.user.username} ${row.user.firstName} ${row.user.lastName}`
                  .toLowerCase()
                  .includes(query)),
          )
          .map((row) => [
            row.user.id,
            {
              id: row.user.id,
              username: row.user.username,
              name:
                [row.user.firstName, row.user.lastName]
                  .filter(Boolean)
                  .join(" ") || row.user.username,
              organization: row.membership?.organization
                ? {
                    id: row.membership.organization.id,
                    name: row.membership.organization.name,
                  }
                : null,
            },
          ]),
      ).values(),
    ].slice(0, 20);
  }
  async requestGuardian(user: AuthenticatedUser, guardianUserId: string) {
    const student = await this.selfStudent(user);
    const selection = await this.guardianSelection(user);
    if (!selection.change.allowed)
      throw new ApiException(
        429,
        "GUARDIAN_CHANGE_COOLDOWN",
        "تغییر سرپرست تا ۳۰ روز پس از آخرین تأیید ممکن نیست.",
      );
    const candidates = await this.guardianCandidates(user, "");
    const guardian = candidates.find((item) => item.id === guardianUserId);
    if (!guardian)
      throw new ApiException(
        404,
        "GUARDIAN_NOT_AVAILABLE",
        "سرپرست قابل انتخاب نیست.",
      );
    const account = await this.users.findOneByOrFail({ id: guardianUserId });
    const organization = guardian.organization ? await this.organizations.findOneByOrFail({ id: guardian.organization.id }) : null;
    let item = await this.relationships.findOne({
      where: {
        fromUser: { id: guardianUserId },
        toStudent: { id: student.id },
        organization: organization ? { id: organization.id } : undefined,
        type: RelationshipType.GUARDIAN_OF,
      },
    });
    if (
      item &&
      ![RelationshipStatus.REJECTED, RelationshipStatus.REVOKED].includes(
        item.status,
      )
    )
      throw new ApiException(
        409,
        "RELATIONSHIP_EXISTS",
        "درخواست این سرپرست از قبل ثبت شده است.",
      );
    item ??= this.relationships.create({
      fromUser: account,
      toStudent: student,
      organization,
      type: RelationshipType.GUARDIAN_OF,
    });
    item.status = RelationshipStatus.PENDING;
    item.acceptedAt = null;
    item.revokedAt = null;
    const saved = await this.relationships.save(item);
    const advisors = await this.relationships.find({
      where: {
        toStudent: { id: student.id },
        type: RelationshipType.ADVISOR_OF,
        status: RelationshipStatus.ACTIVE,
      },
      relations: { fromUser: true },
    });
    await this.notifications.createForUsers(
      [guardianUserId, ...advisors.map((row) => row.fromUser.id)],
      {
        type: "GUARDIAN_SELECTION",
        category: "relationships",
        title: "درخواست انتخاب سرپرست",
        body: `${student.name} درخواست انتخاب سرپرست ثبت کرد.`,
        url: "/admin/access",
        data: { studentId: student.id, relationshipId: saved.id },
      },
    );
    return this.project(
      Object.assign(saved, {
        fromUser: account,
        toStudent: student,
        organization,
      }),
    );
  }
  async cancelGuardianRequest(user: AuthenticatedUser, id: string) {
    const student = await this.selfStudent(user);
    const item = await this.relationships.findOne({
      where: {
        id,
        toStudent: { id: student.id },
        type: RelationshipType.GUARDIAN_OF,
        status: RelationshipStatus.PENDING,
      },
    });
    if (!item)
      throw new ApiException(404, "NOT_FOUND", "درخواست سرپرست پیدا نشد.");
    item.status = RelationshipStatus.REVOKED;
    item.revokedAt = new Date();
    await this.relationships.save(item);
    return { id, cancelled: true };
  }
  async allowGuardianChange(user: AuthenticatedUser, studentId: string) {
    if (!this.platform(user))
      throw new ApiException(
        403,
        "PLATFORM_ADMIN_REQUIRED",
        "فقط مدیر پلتفرم می‌تواند محدودیت تغییر سرپرست را بردارد.",
      );
    const student = await this.students.findOneBy({ id: studentId });
    if (!student)
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
    student.guardianChangedAt = null;
    await this.students.save(student);
    return { studentId, guardianChangeAllowed: true };
  }
  private async selfStudent(user: AuthenticatedUser) {
    if (!(user.roles || [user.role]).includes("STUDENT"))
      throw new ApiException(
        403,
        "STUDENT_REQUIRED",
        "این عملیات ویژه دانش‌آموز است.",
      );
    const student = await this.students.findOne({
      where: { user: { id: user.id } },
      relations: { user: true },
    });
    if (!student)
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز پیدا نشد.");
    return student;
  }
  private project(item: UserRelationship) {
    return {
      id: item.id,
      type: item.type,
      status: item.status,
      fromUser: {
        id: item.fromUser.id,
        username: item.fromUser.username,
        firstName: item.fromUser.firstName,
        lastName: item.fromUser.lastName,
      },
      student: item.toStudent
        ? { id: item.toStudent.id, name: item.toStudent.name }
        : undefined,
      organizationId: item.organization?.id ?? null,
      createdAt: item.createdAt,
      acceptedAt: item.acceptedAt,
      revokedAt: item.revokedAt,
    };
  }
}
