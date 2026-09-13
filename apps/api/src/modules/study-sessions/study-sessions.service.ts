import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Student } from "../../database/entities/student.entity";
import { StudySession, StudySessionStatus } from "../../database/entities/study-session.entity";
import { Task } from "../../database/entities/task.entity";
import { FinishStudySessionDto } from "./dto/finish-study-session.dto";
import { RelationshipStatus, RelationshipType, UserRelationship } from "../../database/entities/user-relationship.entity";
import { NotificationsService } from "../notifications";

@Injectable()
export class StudySessionsService {
  constructor(
    @InjectRepository(StudySession) private readonly sessions: Repository<StudySession>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @Optional() @InjectRepository(UserRelationship) private readonly relationships?: Repository<UserRelationship>,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async start(userId: string, taskId: string) {
    const student = await this.studentForUser(userId);
    const task = await this.tasks.findOne({ where: { id: taskId, plan: { student: { id: student.id } } }, relations: { plan: true } });
    if (!task) throw this.notFound();

    const existing = await this.sessions.findOne({ where: { student: { id: student.id }, status: StudySessionStatus.ACTIVE } });
    if (existing) return this.publicSession(existing);

    const now = new Date();
    const session = await this.sessions.save(this.sessions.create({
      student,
      task,
      status: StudySessionStatus.ACTIVE,
      startedAt: now,
      lastStartedAt: now,
      lastHeartbeatAt: now,
      elapsedSeconds: 0,
    }));
    return this.publicSession(session);
  }

  async active(userId: string) {
    const student = await this.studentForUser(userId);
    const session = await this.sessions.findOne({ where: { student: { id: student.id }, status: StudySessionStatus.ACTIVE }, relations: { task: true } });
    return session ? this.publicSession(session) : null;
  }

  async heartbeat(userId: string, sessionId: string) {
    const session = await this.sessionForUser(userId, sessionId);
    if (session.status !== StudySessionStatus.ACTIVE) return this.publicSession(session);
    const now = new Date();
    session.elapsedSeconds += this.secondsSince(session.lastStartedAt || session.startedAt, now);
    session.lastStartedAt = now;
    session.lastHeartbeatAt = now;
    const saved = await this.sessions.save(session);
    await this.notifyOvertime(saved);
    return this.publicSession(saved);
  }

  async pause(userId: string, sessionId: string) {
    const session = await this.sessionForUser(userId, sessionId);
    if (session.status === StudySessionStatus.FINISHED) return this.publicSession(session);
    const now = new Date();
    if (session.status === StudySessionStatus.ACTIVE) {
      session.elapsedSeconds += this.secondsSince(session.lastStartedAt || session.startedAt, now);
      session.pausedAt = now;
      session.lastHeartbeatAt = now;
      session.status = StudySessionStatus.PAUSED;
    }
    return this.publicSession(await this.sessions.save(session));
  }

  async resume(userId: string, sessionId: string) {
    const session = await this.sessionForUser(userId, sessionId);
    if (session.status === StudySessionStatus.PAUSED) {
      const now = new Date();
      session.status = StudySessionStatus.ACTIVE;
      session.lastStartedAt = now;
      session.lastHeartbeatAt = now;
    }
    return this.publicSession(await this.sessions.save(session));
  }

  async finish(userId: string, sessionId: string, dto: FinishStudySessionDto) {
    const session = await this.sessionForUser(userId, sessionId);
    if (session.status !== StudySessionStatus.FINISHED) {
      const now = new Date();
      if (session.status === StudySessionStatus.ACTIVE) session.elapsedSeconds += this.secondsSince(session.lastStartedAt || session.startedAt, now);
      session.status = StudySessionStatus.FINISHED;
      session.finishedAt = now;
      session.lastHeartbeatAt = now;
      session.actualTests = dto.actualTests ?? session.actualTests;
      session.difficulty = dto.difficulty ?? session.difficulty;
      session.note = dto.note ?? session.note;
    }
    return this.publicSession(await this.sessions.save(session));
  }

  private async studentForUser(userId: string) {
    const student = await this.students.findOne({ where: { user: { id: userId } } });
    if (!student) throw this.notFound();
    return student;
  }

  private async sessionForUser(userId: string, sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId, student: { user: { id: userId } } }, relations: { task: true, student: true } });
    if (!session) throw this.notFound();
    return session;
  }

  private publicSession(session: StudySession) {
    return {
      id: session.id,
      taskId: session.task?.id,
      status: session.status,
      startedAt: session.startedAt,
      lastHeartbeatAt: session.lastHeartbeatAt,
      pausedAt: session.pausedAt,
      finishedAt: session.finishedAt,
      elapsedSeconds: session.elapsedSeconds,
      actualTests: session.actualTests,
      difficulty: session.difficulty,
      note: session.note,
    };
  }

  private secondsSince(start: Date, end: Date) {
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  }

  private async notifyOvertime(session: StudySession) {
    const limitSeconds = Math.max(0, Number(session.task?.duration || 0) * 60);
    if (!limitSeconds || session.elapsedSeconds < limitSeconds || !this.relationships || !this.notifications || !session.student?.id) return;
    const advisers = await this.relationships.find({
      where: { toStudent: { id: session.student.id }, type: RelationshipType.ADVISOR_OF, status: RelationshipStatus.ACTIVE },
      relations: { fromUser: true },
    });
    if (!advisers.length) return;
    const excessiveAt = Math.max(Math.ceil(limitSeconds * 1.5), limitSeconds + 15 * 60);
    const overtimeMinutes = Math.max(0, Math.floor((session.elapsedSeconds - limitSeconds) / 60));
    const studentName = session.student.name || "دانش‌آموز";
    const taskTitle = session.task.title || session.task.subject || "تکلیف مطالعه";
    const recipients = advisers.map((item) => item.fromUser.id);
    const notify = (level: "limit" | "excessive") => this.notifications!.createForUsers(recipients, {
        type: "STUDY_OVERTIME", category: "study", priority: level === "excessive" ? "high" : "normal",
        title: level === "excessive" ? "ادامه طولانی جلسه مطالعه" : "رسیدن به سقف زمان مطالعه",
        body: level === "excessive"
          ? `${studentName} مطالعه «${taskTitle}» را ${overtimeMinutes.toLocaleString("fa-IR")} دقیقه بیشتر از زمان تعیین‌شده ادامه داده است.`
          : `${studentName} به سقف ${Math.round(limitSeconds / 60).toLocaleString("fa-IR")} دقیقه‌ای مطالعه «${taskTitle}» رسیده و همچنان ادامه می‌دهد.`,
        url: `/admin/planner?studentId=${encodeURIComponent(session.student.id)}`,
        data: { studentId: session.student.id, taskId: session.task.id, sessionId: session.id, level, elapsedSeconds: session.elapsedSeconds, limitSeconds },
        dedupeKey: `study-overtime:${session.id}:${level}`,
      });
    await notify("limit");
    if (session.elapsedSeconds >= excessiveAt) await notify("excessive");
  }

  private notFound() {
    return new ApiException(404, "STUDY_SESSION_NOT_FOUND", "جلسه مطالعه پیدا نشد.");
  }
}
