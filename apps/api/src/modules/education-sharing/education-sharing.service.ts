import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { LearningResource, LearningResourceAssignment, OrganizationMembership, Plan, Student, Task } from "../../database/entities";
import { MembershipStatus } from "../../database/entities/organization-membership.entity";
import { AuthenticatedUser } from "../auth";
import { AuthorizationService, UserContext } from "../authorization";

@Injectable()
export class EducationSharingService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(OrganizationMembership) private readonly memberships: Repository<OrganizationMembership>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(LearningResource) private readonly resources: Repository<LearningResource>,
    @InjectRepository(LearningResourceAssignment) private readonly assignments: Repository<LearningResourceAssignment>,
    private readonly authorization: AuthorizationService,
  ) {}

  async peers(actor: AuthenticatedUser) {
    const source = await this.studentForActor(actor);
    const organizationIds = await this.activeOrganizationIds(source.user!.id);
    if (!organizationIds.length) return [];
    const rows = await this.memberships.find({
      where: { organization: { id: In(organizationIds) }, status: MembershipStatus.ACTIVE },
      relations: { user: { student: true }, organization: true },
    });
    const unique = new Map<string, { id: string; name: string; grade: string; organizationName: string }>();
    for (const row of rows) {
      const student = row.user.student;
      if (!student || student.id === source.id || student.accountStatus !== "active") continue;
      unique.set(student.id, { id: student.id, name: student.name, grade: student.grade, organizationName: row.organization.name });
    }
    return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name, "fa"));
  }

  async sharePlan(actor: AuthenticatedUser, planId: string, targetStudentId: string, date?: string) {
    const source = await this.plans.findOne({ where: { id: planId }, relations: { student: { user: true }, tasks: true } });
    if (!source) throw new ApiException(404, "PLAN_NOT_FOUND", "برنامه پیدا نشد.");
    const target = await this.requireShareScope(actor, source.student, targetStudentId, "plans.create");
    const targetDate = date || source.date;
    let copy = await this.plans.findOne({ where: { student: { id: target.id }, date: targetDate }, relations: { tasks: true } });
    if (copy) await this.tasks.delete({ plan: { id: copy.id } });
    else copy = await this.plans.save(this.plans.create({ student: target, date: targetDate, status: source.status }));
    copy.status = source.status;
    copy.tasks = source.tasks.map((task) => this.tasks.create({
      plan: copy,
      type: task.type,
      title: task.title,
      subject: task.subject,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      testCount: task.testCount,
      note: task.note,
      priority: task.priority,
      status: "PLANNED",
      completedAt: null,
    }));
    await this.tasks.save(copy.tasks);
    return this.plans.findOneOrFail({ where: { id: copy.id }, relations: { tasks: true, student: true } });
  }

  async shareResource(actor: AuthenticatedUser, resourceId: string, targetStudentId: string) {
    const resource = await this.resources.findOne({ where: { id: resourceId, status: "PUBLISHED" }, relations: { assignments: { student: { user: true } }, createdBy: true } });
    if (!resource) throw new ApiException(404, "LEARNING_RESOURCE_NOT_FOUND", "محتوای آموزشی پیدا نشد.");
    const roles = actor.roles || [actor.role];
    const actorStudent = await this.students.findOne({ where: { user: { id: actor.id } }, relations: { user: true } });
    let target: Student;
    if (roles.includes("STUDENT")) {
      const source = actorStudent ? resource.assignments.find((item) => item.student.id === actorStudent.id)?.student : undefined;
      if (!source) throw new ApiException(403, "RESOURCE_SHARE_FORBIDDEN", "این محتوا برای اشتراک‌گذاری در دسترس شما نیست.");
      target = await this.requireShareScope(actor, source, targetStudentId, "learning_resources.manage");
    } else {
      target = await this.requireStaffResourceScope(actor, resource, targetStudentId);
    }
    const existing = await this.assignments.findOne({ where: { resource: { id: resource.id }, student: { id: target.id } } });
    if (!existing) await this.assignments.save(this.assignments.create({ resource, student: target }));
    return { resourceId: resource.id, targetStudentId: target.id, shared: !existing, alreadyShared: !!existing };
  }

  private async requireStaffResourceScope(actor: AuthenticatedUser, resource: LearningResource, targetStudentId: string) {
    const target = await this.students.findOne({ where: { id: targetStudentId }, relations: { user: true } });
    if (!target || target.accountStatus !== "active") throw new ApiException(404, "SHARE_TARGET_NOT_FOUND", "دانش‌آموز گیرنده پیدا نشد.");
    const context = this.context(actor);
    const platform = context.roles.includes("PLATFORM_ADMIN");
    const managesTarget = await this.authorization.canAccessStudent(context, target.id, "learning_resources.manage");
    const managesSources = resource.assignments.length > 0 && (await Promise.all(resource.assignments.map((item) => this.authorization.canAccessStudent(context, item.student.id, "learning_resources.manage")))).every(Boolean);
    if (!managesTarget || (!platform && resource.createdBy.id !== actor.id && !managesSources)) throw new ApiException(403, "SHARE_SCOPE_FORBIDDEN", "این محتوا یا دانش‌آموز خارج از محدوده دسترسی شما است.");
    return target;
  }

  private async requireShareScope(actor: AuthenticatedUser, source: Student, targetStudentId: string, staffCapability: string) {
    if (source.id === targetStudentId) throw new ApiException(400, "SHARE_TARGET_SAME_STUDENT", "گیرنده باید دانش‌آموز دیگری باشد.");
    const target = await this.students.findOne({ where: { id: targetStudentId }, relations: { user: true } });
    if (!target || target.accountStatus !== "active") throw new ApiException(404, "SHARE_TARGET_NOT_FOUND", "دانش‌آموز گیرنده پیدا نشد.");
    const roles = actor.roles || [actor.role];
    if (roles.includes("STUDENT")) {
      if (source.user?.id !== actor.id || !(await this.shareOrganization(source, target))) throw new ApiException(403, "SHARE_SCOPE_FORBIDDEN", "اشتراک‌گذاری فقط با دانش‌آموزان سازمان مشترک مجاز است.");
      return target;
    }
    const context = this.context(actor);
    if (!(await this.authorization.canAccessStudent(context, source.id, staffCapability)) || !(await this.authorization.canAccessStudent(context, target.id, staffCapability))) throw new ApiException(403, "SHARE_SCOPE_FORBIDDEN", "یک یا چند دانش‌آموز خارج از محدوده دسترسی شما هستند.");
    return target;
  }

  private async studentForActor(actor: AuthenticatedUser) {
    const student = await this.students.findOne({ where: { user: { id: actor.id } }, relations: { user: true } });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return student;
  }
  private async shareOrganization(left: Student, right: Student) {
    if (!left.user || !right.user) return false;
    const [leftIds, rightIds] = await Promise.all([this.activeOrganizationIds(left.user.id), this.activeOrganizationIds(right.user.id)]);
    return leftIds.some((id) => rightIds.includes(id));
  }
  private async activeOrganizationIds(userId: string) {
    const rows = await this.memberships.find({ where: { user: { id: userId }, status: MembershipStatus.ACTIVE }, relations: { organization: true } });
    return rows.map((row) => row.organization.id);
  }
  private context(actor: AuthenticatedUser): UserContext {
    return { ...actor, roles: actor.roles || [actor.role], capabilities: actor.capabilities || [], membershipIds: actor.membershipIds || [], organizationIds: actor.organizationIds || [] };
  }
}
