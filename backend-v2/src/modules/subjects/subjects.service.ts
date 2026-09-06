import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import {
  MembershipStatus,
  OrganizationMembership,
} from "../../database/entities/organization-membership.entity";
import { Organization } from "../../database/entities/organization.entity";
import { Student } from "../../database/entities/student.entity";
import { StudentSubject } from "../../database/entities/student-subject.entity";
import { Subject } from "../../database/entities/subject.entity";
import { TeacherSubjectAssignment } from "../../database/entities/teacher-subject-assignment.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { User } from "../../database/entities/user.entity";
import {
  AuthorizationService,
  UserContext,
} from "../authorization/authorization.service";
import { AuthenticatedUser } from "../auth/auth.service";
import {
  AssignTeacherSubjectDto,
  CreateSubjectDto,
  UpdateStudentSubjectDto,
  UpdateSubjectDto,
} from "./subject.dto";

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private subjects: Repository<Subject>,
    @InjectRepository(StudentSubject)
    private settings: Repository<StudentSubject>,
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(Organization)
    private organizations: Repository<Organization>,
    @InjectRepository(TeacherSubjectAssignment)
    private teacherSubjects: Repository<TeacherSubjectAssignment>,
    @InjectRepository(OrganizationMembership)
    private memberships: Repository<OrganizationMembership>,
    @InjectRepository(UserRoleAssignment)
    private roleAssignments: Repository<UserRoleAssignment>,
    @InjectRepository(User) private users: Repository<User>,
    private authorization: AuthorizationService,
  ) {}

  private context(u: AuthenticatedUser): UserContext {
    return {
      ...u,
      roles: u.roles ?? [u.role],
      capabilities: u.capabilities ?? [],
      membershipIds: u.membershipIds ?? [],
      organizationIds: u.organizationIds ?? [],
    };
  }

  async list(u: AuthenticatedUser) {
    const c = this.context(u);
    if (c.roles.length === 1 && c.roles[0] === "TEACHER") {
      const rows = await this.teacherSubjects.find({
        where: {
          teacher: { id: c.id },
          organization: { id: In(c.organizationIds) },
          subject: { active: true },
        },
        relations: { subject: { organization: true } },
        order: { subject: { name: "ASC" } },
      });
      return rows.map((row) => row.subject);
    }
    const orgs = c.organizationIds;
    return this.subjects.find({
      where: orgs.length
        ? [
            { organization: IsNull(), active: true },
            { organization: { id: In(orgs) }, active: true },
          ]
        : { organization: IsNull(), active: true },
      order: { name: "ASC" },
    });
  }

  async create(u: AuthenticatedUser, d: CreateSubjectDto) {
    const c = this.context(u);
    this.authorization.requireCapability(c, "subjects.create");
    if (
      d.organizationId &&
      !this.authorization.canAccessOrganization(
        c,
        d.organizationId,
        "organization.read",
      )
    )
      throw new ApiException(
        403,
        "ORGANIZATION_FORBIDDEN",
        "به این سازمان دسترسی ندارید.",
      );
    const organization = d.organizationId
      ? await this.organizations.findOne({ where: { id: d.organizationId } })
      : null;
    if (d.organizationId && !organization)
      throw new ApiException(404, "NOT_FOUND", "سازمان یافت نشد.");
    return this.subjects.save(
      this.subjects.create({
        code: d.code.trim().toLowerCase(),
        name: d.name.trim(),
        organization,
        active: true,
      }),
    );
  }

  async update(u: AuthenticatedUser, id: string, d: UpdateSubjectDto) {
    const c = this.context(u);
    this.authorization.requireCapability(
      c,
      d.active === false ? "subjects.archive" : "subjects.update",
    );
    const subject = await this.subjects.findOne({
      where: { id },
      relations: { organization: true },
    });
    if (!subject) throw new ApiException(404, "NOT_FOUND", "درس یافت نشد.");
    if (
      subject.organization &&
      !this.authorization.canAccessOrganization(
        c,
        subject.organization.id,
        "organization.read",
      )
    )
      throw new ApiException(404, "NOT_FOUND", "درس یافت نشد.");
    Object.assign(subject, d);
    return this.subjects.save(subject);
  }

  async assignTeacher(
    u: AuthenticatedUser,
    subjectId: string,
    d: AssignTeacherSubjectDto,
  ) {
    const c = this.context(u);
    this.authorization.requireCapability(c, "organization.members.manage");
    if (
      !this.authorization.canAccessOrganization(
        c,
        d.organizationId,
        "organization.members.manage",
      )
    )
      throw new ApiException(404, "NOT_FOUND", "سازمان یافت نشد.");
    const [teacher, subject, organization, membership] = await Promise.all([
      this.users.findOne({ where: { id: d.teacherId } }),
      this.subjects.findOne({
        where: { id: subjectId },
        relations: { organization: true },
      }),
      this.organizations.findOne({ where: { id: d.organizationId } }),
      this.memberships.findOne({
        where: {
          user: { id: d.teacherId },
          organization: { id: d.organizationId },
          status: MembershipStatus.ACTIVE,
        },
      }),
    ]);
    if (
      !teacher ||
      !subject ||
      !organization ||
      !membership ||
      (subject.organization && subject.organization.id !== organization.id)
    )
      throw new ApiException(
        404,
        "NOT_FOUND",
        "معلم، درس یا عضویت معتبر یافت نشد.",
      );
    const teacherRole = await this.roleAssignments.findOne({
      where: {
        user: { id: teacher.id },
        membership: { id: membership.id },
        role: { code: "TEACHER" },
      },
    });
    if (!teacherRole)
      throw new ApiException(
        422,
        "TEACHER_ROLE_REQUIRED",
        "کاربر در این سازمان نقش معلم ندارد.",
      );
    const existing = await this.teacherSubjects.findOne({
      where: {
        teacher: { id: teacher.id },
        subject: { id: subject.id },
        organization: { id: organization.id },
      },
    });
    return (
      existing ??
      this.teacherSubjects.save(
        this.teacherSubjects.create({ teacher, subject, organization }),
      )
    );
  }

  async listTeachers(u: AuthenticatedUser, subjectId: string, organizationId: string) {
    const c = this.context(u);
    this.authorization.requireCapability(c, "organization.members.manage");
    if (!organizationId || !this.authorization.canAccessOrganization(c, organizationId, "organization.members.manage"))
      throw new ApiException(404, "NOT_FOUND", "سازمان یافت نشد.");
    const rows = await this.teacherSubjects.find({
      where: { subject: { id: subjectId }, organization: { id: organizationId } },
      relations: { teacher: true },
      order: { createdAt: "ASC" },
    });
    return rows.map((row) => ({ id: row.id, teacher: { id: row.teacher.id, username: row.teacher.username, firstName: row.teacher.firstName, lastName: row.teacher.lastName }, createdAt: row.createdAt }));
  }

  async unassignTeacher(
    u: AuthenticatedUser,
    subjectId: string,
    teacherId: string,
    organizationId: string,
  ) {
    const c = this.context(u);
    this.authorization.requireCapability(c, "organization.members.manage");
    if (
      !this.authorization.canAccessOrganization(
        c,
        organizationId,
        "organization.members.manage",
      )
    )
      throw new ApiException(404, "NOT_FOUND", "سازمان یافت نشد.");
    const result = await this.teacherSubjects.delete({
      teacher: { id: teacherId },
      subject: { id: subjectId },
      organization: { id: organizationId },
    });
    return { removed: Boolean(result.affected) };
  }

  async forStudent(u: AuthenticatedUser, studentId: string) {
    const c = this.context(u);
    if (
      !(await this.authorization.canAccessStudent(
        c,
        studentId,
        "studentSubjects.read",
      ))
    )
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یافت نشد.");
    const rows = await this.settings.find({
      where: { student: { id: studentId } },
      relations: { subject: true },
      order: { subject: { name: "ASC" } },
    });
    return rows.map((row) => ({
      subject: {
        id: row.subject.id,
        code: row.subject.code,
        name: row.subject.name,
      },
      enabled: row.enabled,
      displayName: row.displayName,
      weeklyTargetMinutes: row.weeklyTargetMinutes,
    }));
  }

  async configure(
    u: AuthenticatedUser,
    studentId: string,
    subjectId: string,
    d: UpdateStudentSubjectDto,
  ) {
    const c = this.context(u);
    if (
      !(await this.authorization.canAccessStudent(
        c,
        studentId,
        "studentSubjects.manage",
      ))
    )
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یافت نشد.");
    const [student, subject] = await Promise.all([
      this.students.findOne({ where: { id: studentId } }),
      this.subjects.findOne({ where: { id: subjectId } }),
    ]);
    if (!student || !subject)
      throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یا درس یافت نشد.");
    let row = await this.settings.findOne({
      where: { student: { id: studentId }, subject: { id: subjectId } },
    });
    row = row ?? this.settings.create({ student, subject });
    Object.assign(row, d);
    return this.settings.save(row);
  }
}
