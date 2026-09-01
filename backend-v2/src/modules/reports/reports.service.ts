import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { DailyReport } from "../../database/entities/daily-report.entity";
import { RecoveryRequest, RecoveryRequestStatus } from "../../database/entities/recovery-request.entity";
import { Student } from "../../database/entities/student.entity";
import { CreateDailyReportDto } from "./dto/create-daily-report.dto";
import { CreateRecoveryRequestDto } from "./dto/create-recovery-request.dto";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(DailyReport) private readonly reports: Repository<DailyReport>,
    @InjectRepository(RecoveryRequest) private readonly recoveries: Repository<RecoveryRequest>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
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

  private async studentForUser(userId: string) {
    const student = await this.students.findOne({ where: { user: { id: userId } } });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "دانش‌آموز پیدا نشد.");
    return student;
  }
}