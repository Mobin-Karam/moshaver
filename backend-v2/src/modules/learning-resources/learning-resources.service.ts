import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { LearningResource, LearningResourceAssignment, Student, User } from "../../database/entities";
import { AuthenticatedUser } from "../auth/auth.service";
import { AuthorizationService } from "../authorization/authorization.service";
import { SaveLearningResourceDto } from "./learning-resources.dto";

@Injectable()
export class LearningResourcesService {
  constructor(
    @InjectRepository(LearningResource) private resources: Repository<LearningResource>,
    @InjectRepository(LearningResourceAssignment) private assignments: Repository<LearningResourceAssignment>,
    @InjectRepository(Student) private students: Repository<Student>,
    private authorization: AuthorizationService,
  ) {}

  async listManaged(actor: AuthenticatedUser) {
    const rows = await this.resources.find({ relations: { assignments: { student: true }, createdBy: true }, order: { updatedAt: "DESC" } });
    if (this.isPlatformAdmin(actor)) return rows;
    const visible = await Promise.all(rows.map(async (resource) =>
      resource.createdBy.id === actor.id || this.canAccessEveryStudent(actor, resource.assignments.map((item) => item.student.id)),
    ));
    return rows.filter((_, index) => visible[index]);
  }

  async listForStudent(actor: AuthenticatedUser, studentId?: string) {
    let target = studentId;
    if (!target) target = (await this.students.findOne({ where: { user: { id: actor.id } }, relations: { user: true } }))?.id;
    if (!target) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    if (!(await this.authorization.canAccessStudent(this.context(actor), target, "learning_resources.read"))) throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید.");
    return this.assignments.find({ where: { student: { id: target }, resource: { status: "PUBLISHED" } }, relations: { resource: true }, order: { assignedAt: "DESC" } }).then((rows) => rows.map((row) => row.resource));
  }

  async create(actor: AuthenticatedUser, dto: SaveLearningResourceDto) {
    await this.requireStudentScope(actor, dto.studentIds);
    const resource = await this.resources.save(this.resources.create({ ...this.clean(dto), createdBy: { id: actor.id } as User }));
    await this.replaceAssignments(resource, dto.studentIds);
    return this.find(resource.id);
  }

  async update(actor: AuthenticatedUser, id: string, dto: SaveLearningResourceDto) {
    const resource = await this.requireManageAccess(actor, id);
    await this.requireStudentScope(actor, dto.studentIds);
    Object.assign(resource, this.clean(dto));
    await this.resources.save(resource);
    await this.replaceAssignments(resource, dto.studentIds);
    return this.find(id);
  }

  async remove(actor: AuthenticatedUser, id: string) { const resource = await this.requireManageAccess(actor, id); await this.resources.remove(resource); return { deleted: true }; }
  private find(id: string) { return this.resources.findOneOrFail({ where: { id }, relations: { assignments: { student: true }, createdBy: true } }); }
  private async findEntity(id: string) { const value = await this.resources.findOne({ where: { id } }); if (!value) throw new ApiException(404, "LEARNING_RESOURCE_NOT_FOUND", "محتوا پیدا نشد."); return value; }
  private clean(dto: SaveLearningResourceDto) { const url = new URL(dto.url); if (url.protocol !== "https:") throw new ApiException(400, "INVALID_URL", "پیوند باید امن باشد."); return { title: dto.title.trim(), description: dto.description?.trim() || "", type: dto.type, url: url.toString(), status: dto.status || "PUBLISHED" }; }
  private async replaceAssignments(resource: LearningResource, ids: string[]) { const students = ids.length ? await this.students.findBy({ id: In(ids) }) : []; if (students.length !== ids.length) throw new ApiException(400, "INVALID_STUDENTS", "یک یا چند دانش‌آموز معتبر نیستند."); await this.assignments.delete({ resource: { id: resource.id } }); if (students.length) await this.assignments.save(students.map((student) => this.assignments.create({ resource, student }))); }
  private context(actor: AuthenticatedUser) { return { ...actor, roles: actor.roles || [actor.role], capabilities: actor.capabilities || [], membershipIds: actor.membershipIds || [], organizationIds: actor.organizationIds || [] }; }
  private isPlatformAdmin(actor: AuthenticatedUser) { return (actor.roles || [actor.role]).includes("PLATFORM_ADMIN"); }
  private async canAccessEveryStudent(actor: AuthenticatedUser, ids: string[]) { return ids.length > 0 && (await Promise.all(ids.map((id) => this.authorization.canAccessStudent(this.context(actor), id, "learning_resources.manage")))).every(Boolean); }
  private async requireStudentScope(actor: AuthenticatedUser, ids: string[]) { if (!ids.length) return; if (!(await this.canAccessEveryStudent(actor, ids))) throw new ApiException(403, "STUDENT_SCOPE_FORBIDDEN", "یک یا چند دانش‌آموز خارج از محدوده دسترسی شما هستند."); }
  private async requireManageAccess(actor: AuthenticatedUser, id: string) { const resource = await this.resources.findOne({ where: { id }, relations: { assignments: { student: true }, createdBy: true } }); if (!resource) throw new ApiException(404, "LEARNING_RESOURCE_NOT_FOUND", "محتوا پیدا نشد."); if (!this.isPlatformAdmin(actor) && resource.createdBy.id !== actor.id && !(await this.canAccessEveryStudent(actor, resource.assignments.map((item) => item.student.id)))) throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید."); return resource; }
}
