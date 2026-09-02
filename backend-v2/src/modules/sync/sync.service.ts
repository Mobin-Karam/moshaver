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
  ) {}

  async pull(user: AuthenticatedUser, lastSync?: string) {
    const since = this.parseSince(lastSync);
    const student = await this.students.findOne({ where: { user: { id: user.id } } });
    if (!student) throw this.notFound();
    const planWhere = since ? { student: { id: student.id }, createdAt: MoreThanOrEqual(since) } : { student: { id: student.id } };
    const [plans, sessions, attempts, notifications] = await Promise.all([
      this.plans.find({ where: planWhere as any, relations: { tasks: true }, order: { createdAt: "ASC" } }),
      this.sessions.find({ where: { student: { id: student.id }, ...(since ? { updatedAt: MoreThanOrEqual(since) } : {}) } as any, relations: { task: true }, order: { updatedAt: "ASC" } }),
      this.attempts.find({ where: { student: { id: student.id } } }),
      this.notifications.find({ where: { student: { id: student.id } } }),
    ]);
    return {
      cursor: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      supported: { pull: ["plans", "tasks", "studySessions", "examAttempts", "notifications"], upload: ["taskCompletion", "studySessions"] },
      unsupported: ["messages", "exams", "planWrites", "examWrites", "notificationWrites"],
      plans,
      tasks: plans.flatMap((plan) => plan.tasks || []),
      studySessions: sessions,
      examAttempts: attempts,
      notifications,
    };
  }

  async upload(user: AuthenticatedUser, changes: SyncChangeDto[]) {
    const accepted: Array<{ id: string; result: unknown; replayed?: boolean }> = [];
    const rejected: Array<{ id?: string; code: string }> = [];
    for (const change of changes) {
      const existing = await this.mutations.findOne({ where: { userId: user.id, mutationId: change.id } });
      if (existing) {
        accepted.push({ id: change.id, result: existing.result, replayed: true });
        continue;
      }
      try {
        const result = await this.apply(user.id, change);
        await this.mutations.save(this.mutations.create({ userId: user.id, mutationId: change.id, method: change.method, path: change.path, result }));
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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new ApiException(400, "SYNC_INVALID_CURSOR", "نشانگر همگام‌سازی نامعتبر است.");
    return date;
  }

  private notFound() {
    return new ApiException(404, "STUDENT_NOT_FOUND", "دانش‌آموز پیدا نشد.");
  }
}