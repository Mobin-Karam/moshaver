import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { DailyReport } from "../../database/entities/daily-report.entity";
import { RecoveryRequest, RecoveryRequestStatus } from "../../database/entities/recovery-request.entity";
import { Student } from "../../database/entities/student.entity";
import { CreateDailyReportDto } from "./dto/create-daily-report.dto";
import { CreateRecoveryRequestDto } from "./dto/create-recovery-request.dto";
import { AuthorizationService, UserContext } from "../authorization/authorization.service";
import { User } from "../../database/entities/user.entity";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(DailyReport) private readonly reports: Repository<DailyReport>,
    @InjectRepository(RecoveryRequest) private readonly recoveries: Repository<RecoveryRequest>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly authorization: AuthorizationService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async saveReport(userId: string, dto: CreateDailyReportDto) {
    const student = await this.studentForUser(userId);
    let report = await this.reports.findOne({ where: { student: { id: student.id }, planDate: dto.planDate } });
    report = this.reports.create({ ...(report || {}), student, planDate: dto.planDate, focus: dto.focus, fatigue: dto.fatigue, motivation: dto.motivation, problem: dto.problem || "", tomorrow: dto.tomorrow || "" });
    return this.reports.save(report);
  }

  async listReports(userId: string, limit?: string) {
    const student = await this.studentForUser(userId);
    return this.reports.find({ where: { student: { id: student.id } }, order: { planDate: "DESC" }, take: Math.min(Math.max(Number(limit) || 30, 1), 100) });
  }

  async createRecovery(userId: string, dto: CreateRecoveryRequestDto) {
    const student = await this.studentForUser(userId);
    return this.recoveries.save(this.recoveries.create({ student, planDate: dto.planDate || new Date().toISOString().slice(0, 10), reason: dto.reason || "", note: dto.note || "", status: RecoveryRequestStatus.PENDING }));
  }

  async listRecovery(userId: string) {
    const student = await this.studentForUser(userId);
    return this.recoveries.find({ where: { student: { id: student.id } }, order: { createdAt: "DESC" }, take: 50 });
  }

  async reportsForStudent(context: UserContext, studentId: string) {
    if (!await this.authorization.canAccessStudent(context, studentId, "reports.read")) throw new ApiException(403, "STUDENT_FORBIDDEN", "به این دانش‌آموز دسترسی ندارید.");
    return this.reports.find({ where: { student: { id: studentId } }, order: { planDate: "DESC" }, take: 100 });
  }

  async recoveryForActor(context: UserContext) {
    if (context.roles.includes("STUDENT")) return this.listRecovery(context.id);
    this.authorization.requireCapability(context, "recovery_requests.read");
    const rows = await this.recoveries.find({ relations: { student: true }, order: { createdAt: "DESC" }, take: 100 });
    const allowed = [];
    for (const row of rows) if (await this.authorization.canAccessStudent(context, row.student.id, "recovery_requests.read")) allowed.push(row);
    return allowed;
  }

  async moderateRecovery(context: UserContext, id: string, status: RecoveryRequestStatus) {
    this.authorization.requireCapability(context, "recovery_requests.manage");
    if (![RecoveryRequestStatus.RESOLVED, RecoveryRequestStatus.DISMISSED].includes(status)) throw new ApiException(400, "STATUS_INVALID", "وضعیت معتبر نیست.");
    const row = await this.recoveries.findOne({ where: { id }, relations: { student: true } });
    if (!row) throw new ApiException(404, "RECOVERY_NOT_FOUND", "درخواست پیدا نشد.");
    if (!await this.authorization.canAccessStudent(context, row.student.id, "recovery_requests.manage")) throw new ApiException(403, "STUDENT_FORBIDDEN", "دسترسی ندارید.");
    row.status = status;
    return this.recoveries.save(row);
  }

  private async studentForUser(userId: string) {
    const student = await this.students.findOne({ where: { user: { id: userId } } });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "دانش‌آموز پیدا نشد.");
    return student;
  }
}
