import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Notification } from "../../database/entities/notification.entity";
import { Plan } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { StudySession } from "../../database/entities/study-session.entity";
import { SyncMutation } from "../../database/entities/sync-mutation.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CompleteTaskDto } from "../tasks/dto/complete-task.dto";
import { TasksService } from "../tasks/tasks.service";
import { FinishStudySessionDto } from "../study-sessions/dto/finish-study-session.dto";
import { StartStudySessionDto } from "../study-sessions/dto/start-study-session.dto";
import { StudySessionsService } from "../study-sessions/study-sessions.service";
import { SyncChangeDto } from "./dto/sync.dto";
import { Exam, ExamAssignment, LearningItem, LearningReview, Task } from "../../database/entities";
import { ReportsService } from "../reports/reports.service";
import { StudentsService } from "../students/students.service";
import { ExamsService } from "../exams/exams.service";

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(StudySession) private readonly sessions: Repository<StudySession>,
    @InjectRepository(ExamAttempt) private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(SyncMutation) private readonly mutations: Repository<SyncMutation>,
    private readonly tasks: TasksService,
    private readonly studySessions: StudySessionsService,
    @InjectRepository(Task) private readonly taskRepo?: Repository<Task>,
    @InjectRepository(Exam) private readonly exams?: Repository<Exam>,
    @InjectRepository(ExamAssignment) private readonly assignments?: Repository<ExamAssignment>,
    @InjectRepository(LearningItem) private readonly learning?: Repository<LearningItem>,
    @InjectRepository(LearningReview) private readonly reviews?: Repository<LearningReview>,
    private readonly reports?: ReportsService,
    private readonly studentsService?: StudentsService,
    private readonly examsService?: ExamsService,
  ) {}

  async pull(user: AuthenticatedUser, lastSync?: string) {
    const parsed = this.parseSince(lastSync);
    const since = parsed?.since;
    const student = await this.students.findOne({ where: { user: { id: user.id } } });
    if (!student) throw this.notFound();
    const planWhere = since ? { student: { id: student.id }, createdAt: MoreThanOrEqual(since) } : { student: { id: student.id } };
    const assigned = this.assignments ? await this.assignments.find({ where: { student: { id: student.id } }, relations: { exam: { questions: true } } }) : [];
    const [plans, tasks, sessions, attempts, notifications, learningItems, reviews] = await Promise.all([
      this.plans.find({ where: planWhere as any, relations: { tasks: true }, order: { createdAt: "ASC" } }),
      this.taskRepo ? this.taskRepo.find({ where: { plan: { student: { id: student.id } }, ...(since ? { updatedAt: MoreThanOrEqual(since) } : {}) } as any, relations: { plan: true }, order: { updatedAt: "ASC" }, take: 500 }) : [],
      this.sessions.find({ where: { student: { id: student.id }, ...(since ? { updatedAt: MoreThanOrEqual(since) } : {}) } as any, relations: { task: true }, order: { updatedAt: "ASC" } }),
      this.attempts.find({ where: { student: { id: student.id }, ...(since ? { startedAt: MoreThanOrEqual(since) } : {}) } as any, relations: { exam: true }, take: 500 }),
      this.notifications.find({ where: { user: { id: user.id }, ...(since ? { createdAt: MoreThanOrEqual(since) } : {}) } as any, order: { createdAt: "ASC" }, take: 500 }),
      this.learning ? this.learning.find({ where: { student: { id: student.id }, ...(since ? { updatedAt: MoreThanOrEqual(since) } : {}) } as any, order: { updatedAt: "ASC" }, take: 500 }) : [],
      this.reviews ? this.reviews.createQueryBuilder("r").innerJoin("r.item", "i").where("i.studentId=:studentId", { studentId: student.id }).andWhere(since ? "r.reviewedAt>=:since" : "1=1", { since }).orderBy("r.reviewedAt", "ASC").take(500).getMany() : [],
    ]);
    const serverTime = new Date();
    return {
      cursor: this.cursor(serverTime),
      reset: parsed?.reset || false,
      serverTime: serverTime.toISOString(),
      supported: { pull: ["plans", "tasks", "studySessions", "exams", "examAttempts", "notifications", "learningItems", "reviews"], upload: ["taskCompletion", "studySessions", "reports", "recoveryRequests", "reviews", "examAutosave"] },
      unsupported: ["messages", "planWrites", "examSubmission", "notificationWrites"],
      plans,
      tasks: this.taskRepo ? tasks : plans.flatMap((plan) => plan.tasks || []),
      studySessions: sessions,
      exams: assigned.map(item => item.exam).filter(exam => !exam.deletedAt).map(exam => ({ id: exam.id, title: exam.title, subject: exam.subject, durationMinutes: exam.duration, openAt: exam.startTime, closeAt: exam.endTime, questionCount: exam.questions?.length || 0, updatedAt: exam.updatedAt })),
      examAttempts: attempts,
      notifications,
      learningItems,
      reviews,
    };
  }

  async upload(user: AuthenticatedUser, changes: SyncChangeDto[]) {
    const accepted: Array<{ id: string; result: unknown; replayed?: boolean }> = [];
    const rejected: Array<{ id?: string; code: string }> = [];
    for (const change of changes) {
      const mutationId = change.clientMutationId || change.id;
      const existing = await this.mutations.findOne({ where: { userId: user.id, clientMutationId: mutationId } });
      if (existing) {
        accepted.push({ id: change.id, result: existing.result, replayed: true });
        continue;
      }
      try {
        const result = await this.apply(user.id, change);
        await this.mutations.save(this.mutations.create({ userId: user.id, mutationId, clientMutationId: mutationId, type: change.type || "api_mutation", method: change.method, path: change.path, result }));
        accepted.push({ id: change.id, result });
      } catch (error) {
        if (error instanceof ApiException) rejected.push({ id: change.id, code: String((error.getResponse() as any).error?.code || "REJECTED") });
        else throw error;
      }
    }
    return { accepted, rejected, acceptedCount: accepted.length, rejectedCount: rejected.length, serverTime: new Date().toISOString() };
  }

  private async apply(userId: string, change: SyncChangeDto) {
    const path = change.path.split("?")[0].replace(/\/$/, "");
    if (change.method === "POST" && /^\/student\/tasks\/[^/]+\/complete$/.test(path)) {
      return this.tasks.complete(userId, path.split("/")[3], await this.validatedBody(CompleteTaskDto, change.body));
    }
    if (change.method === "POST" && path === "/reports" && this.reports) return this.reports.saveReport(userId, change.body as any);
    if (change.method === "POST" && path === "/recovery-requests" && this.reports) return this.reports.createRecovery(userId, change.body as any);
    const review = path.match(/^\/student\/learning\/([^/]+)\/review$/);
    if (change.method === "POST" && review && this.studentsService) { const student = await this.students.findOneOrFail({ where: { user: { id: userId } } }); return this.studentsService.reviewLearningItem(student.id, review[1], Number((change.body as any)?.rating)); }
    const autosave = path.match(/^\/student\/exams\/attempts\/([^/]+)$/);
    if (change.method === "PATCH" && autosave && this.examsService) return this.examsService.saveProgress(autosave[1], Array.isArray((change.body as any)?.answers) ? (change.body as any).answers : [], userId);
    const sessionMatch = path.match(/^\/student\/study-sessions(?:\/([^/]+)\/(heartbeat|pause|resume|finish)|)$/);
    if (change.method === "POST" && sessionMatch) {
      if (!sessionMatch[1]) {
        return this.studySessions.start(userId, (await this.validatedBody(StartStudySessionDto, change.body)).taskId);
      }
      const sessionId = sessionMatch[1];
      if (sessionMatch[2] === "heartbeat") return this.studySessions.heartbeat(userId, sessionId);
      if (sessionMatch[2] === "pause") return this.studySessions.pause(userId, sessionId);
      if (sessionMatch[2] === "resume") return this.studySessions.resume(userId, sessionId);
      return this.studySessions.finish(userId, sessionId, await this.validatedBody(FinishStudySessionDto, change.body));
    }
    throw new ApiException(400, "SYNC_UNSUPPORTED_MUTATION", "این تغییر برای همگام‌سازی پشتیبانی نمی‌شود.");
  }

  private requireObject(body: unknown): asserts body is Record<string, unknown> {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiException(400, "SYNC_INVALID_BODY", "بدنه تغییر نامعتبر است.");
  }

  private async validatedBody<T extends object>(type: new () => T, body: unknown): Promise<T> {
    this.requireObject(body);
    const value = plainToInstance(type, body);
    if ((await validate(value, { whitelist: true, forbidNonWhitelisted: true })).length) throw new ApiException(400, "SYNC_INVALID_BODY", "بدنه تغییر نامعتبر است.");
    return value;
  }

  private parseSince(value?: string) {
    if (!value) return undefined;
    try { const decoded = JSON.parse(Buffer.from(value, "base64url").toString()) as { v: number; t: string }; const date = new Date(decoded.t); if (decoded.v !== 1 || Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000) throw new Error(); const stale = Date.now() - date.getTime() > 90 * 86400000; return { since: stale ? undefined : date, reset: stale }; }
    catch { throw new ApiException(400, "SYNC_INVALID_CURSOR", "نشانگر همگام‌سازی نامعتبر است."); }
  }

  private cursor(date: Date) { return Buffer.from(JSON.stringify({ v: 1, t: date.toISOString() })).toString("base64url"); }

  private notFound() {
    return new ApiException(404, "STUDENT_NOT_FOUND", "دانش‌آموز پیدا نشد.");
  }
}
