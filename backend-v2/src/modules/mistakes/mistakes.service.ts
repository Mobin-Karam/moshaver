import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Mistake } from "../../database/entities/mistake.entity";
import { Student } from "../../database/entities/student.entity";
import { AuthorizationService, UserContext } from "../authorization/authorization.service";

@Injectable()
export class MistakesService {
  constructor(
    @InjectRepository(Mistake) private readonly mistakes: Repository<Mistake>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @Optional() private readonly authorization?: AuthorizationService,
  ) {}

  async list(userId: string, limit?: string) {
    const student = await this.studentForUser(userId);
    const size = Math.min(200, Math.max(1, Number(limit) || 80));
    return this.mistakes.find({ where: { studentId: student.id }, order: { id: "DESC" }, take: size });
  }

  async listForStaff(context: UserContext, studentId: string, limit?: string) {
    if (!this.authorization || !await this.authorization.canAccessStudent(context, studentId, "mistakes.read"))
      throw new ApiException(403, "STUDENT_FORBIDDEN", "به این دانش‌آموز دسترسی ندارید.");
    const size = Math.min(200, Math.max(1, Number(limit) || 80));
    return this.mistakes.find({ where: { studentId }, order: { id: "DESC" }, take: size });
  }

  async detail(userId: string, id: string) {
    const student = await this.studentForUser(userId);
    const mistake = await this.mistakes.findOne({ where: { id, studentId: student.id } });
    if (!mistake) throw new ApiException(404, "MISTAKE_NOT_FOUND", "اشتباه پیدا نشد.");
    return mistake;
  }

  async update(userId: string, id: string, body: { reason?: string; resolved?: boolean }) {
    const mistake = await this.detail(userId, id);
    if (body.reason !== undefined) mistake.reason = String(body.reason).trim();
    if (body.resolved !== undefined) mistake.resolved = Boolean(body.resolved);
    return this.mistakes.save(mistake);
  }

  private async studentForUser(userId: string) {
    const student = await this.students.findOne({ where: { user: { id: userId } } });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return student;
  }
}
