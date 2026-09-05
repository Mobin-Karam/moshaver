import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import {
  ActivityEvent,
  Student,
  StudentPresence,
  Task,
} from "../../database/entities";
import { AuthenticatedUser } from "../auth/auth.service";
import {
  AuthorizationService,
  UserContext,
} from "../authorization/authorization.service";
const EVENT_TYPES = [
  "study_started",
  "study_finished",
  "task_completed",
  "exam_started",
  "exam_submitted",
  "quiz_started",
  "quiz_submitted",
];
@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(StudentPresence)
    private presence: Repository<StudentPresence>,
    @InjectRepository(ActivityEvent) private events: Repository<ActivityEvent>,
    @InjectRepository(Student) private students: Repository<Student>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private authorization: AuthorizationService,
    private db: DataSource,
  ) {}
  private student(userId: string) {
    return this.students.findOneOrFail({ where: { user: { id: userId } } });
  }
  async heartbeat(
    userId: string,
    input: { state?: string; currentTaskId?: string | null },
  ) {
    const student = await this.student(userId);
    const state = ["idle", "studying", "quiz", "exam", "offline"].includes(
      input.state || "",
    )
      ? input.state!
      : "idle";
    const now = new Date();
    let row = await this.presence.findOne({
      where: { student: { id: student.id } },
      relations: { currentTask: true },
    });
    const currentTask = input.currentTaskId
      ? await this.tasks.findOne({
          where: {
            id: input.currentTaskId,
            plan: { student: { id: student.id } },
          },
        })
      : null;
    if (input.currentTaskId && !currentTask)
      throw new ApiException(404, "TASK_NOT_FOUND", "فعالیت پیدا نشد.");
    if (
      row &&
      row.state === state &&
      (row.currentTask?.id || null) === (currentTask?.id || null) &&
      now.getTime() - row.lastSeenAt.getTime() < 30_000
    )
      return this.publicPresence(row, now);
    row ||= this.presence.create({ student });
    Object.assign(row, { state, currentTask, lastSeenAt: now });
    return this.publicPresence(await this.presence.save(row), now);
  }
  async record(
    userId: string,
    input: {
      type: string;
      resourceType?: string;
      resourceId?: string;
      data?: Record<string, unknown>;
    },
  ) {
    if (!EVENT_TYPES.includes(input.type))
      throw new ApiException(
        400,
        "ACTIVITY_TYPE_INVALID",
        "نوع رویداد معتبر نیست.",
      );
    const student = await this.student(userId);
    return this.events.save(
      this.events.create({
        student,
        type: input.type,
        resourceType: String(input.resourceType || "").slice(0, 40),
        resourceId: String(input.resourceId || "").slice(0, 100),
        data: input.data || null,
      }),
    );
  }
  async history(context: UserContext, studentId: string, limit = 50) {
    if (
      !(await this.authorization.canAccessStudent(
        context,
        studentId,
        "student.activity.read",
      ))
    )
      throw new ApiException(
        403,
        "STUDENT_FORBIDDEN",
        "به این دانش‌آموز دسترسی ندارید.",
      );
    return this.events.find({
      where: { student: { id: studentId } },
      order: { createdAt: "DESC" },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
  async live(context: UserContext) {
    const all = await this.students.find({
        relations: { user: true },
        order: { createdAt: "DESC" },
      }),
      allowed = [];
    for (const student of all)
      if (
        await this.authorization.canAccessStudent(
          context,
          student.id,
          "student.live.read",
        )
      )
        allowed.push(student);
    const out = [];
    for (const student of allowed) {
      const [presence, attention] = await Promise.all([
        this.presence.findOne({
          where: { student: { id: student.id } },
          relations: { currentTask: true },
        }),
        this.attention(student.id),
      ]);
      out.push({
        id: student.id,
        name: student.name,
        grade: student.grade,
        major: student.major,
        presence: presence
          ? this.publicPresence(presence)
          : {
              online: false,
              state: "offline",
              lastSeenAt: null,
              currentTask: null,
            },
        attention,
      });
    }
    return out;
  }
  async attentionList(context: UserContext) {
    const rows = await this.live(context);
    return rows
      .filter((x) => x.attention.score > 0)
      .sort((a, b) => b.attention.score - a.attention.score);
  }
  private async attention(studentId: string) {
    const [missed, noStudy, upcoming, recovery, issues] = await Promise.all([
      this.db.query(
        `SELECT COUNT(*)n FROM tasks t JOIN plans p ON p.id=t.planId WHERE p.studentId=? AND p.date<=date('now') AND t.completedAt IS NULL AND t.status<>'DONE'`,
        [studentId],
      ),
      this.db.query(
        `SELECT COUNT(*)n FROM study_sessions WHERE studentId=? AND startedAt>=datetime('now','-3 day')`,
        [studentId],
      ),
      this.db.query(
        `SELECT COUNT(*)n FROM exam_assignments a JOIN exams e ON e.id=a.examId WHERE a.studentId=? AND e.startTime BETWEEN datetime('now') AND datetime('now','+3 day')`,
        [studentId],
      ),
      this.db.query(
        `SELECT COUNT(*)n FROM recovery_requests WHERE studentId=? AND status='PENDING'`,
        [studentId],
      ),
      this.db.query(
        `SELECT COUNT(*)n FROM task_issues WHERE studentId=? AND status='OPEN'`,
        [studentId],
      ),
    ]);
    const signals = [];
    if (missed[0].n)
      signals.push({ type: "MISSED_TASKS", count: missed[0].n, weight: 2 });
    if (!noStudy[0].n)
      signals.push({ type: "NO_RECENT_STUDY", count: 1, weight: 2 });
    if (upcoming[0].n)
      signals.push({ type: "UPCOMING_EXAM", count: upcoming[0].n, weight: 1 });
    if (recovery[0].n)
      signals.push({ type: "OPEN_RECOVERY", count: recovery[0].n, weight: 3 });
    if (issues[0].n)
      signals.push({ type: "TASK_ISSUE", count: issues[0].n, weight: 3 });
    return { score: signals.reduce((n, s) => n + s.weight, 0), signals };
  }
  private publicPresence(row: StudentPresence, now = new Date()) {
    const online = now.getTime() - row.lastSeenAt.getTime() <= 90_000;
    return {
      online,
      state: online ? row.state : "offline",
      lastSeenAt: row.lastSeenAt,
      currentTask: row.currentTask
        ? { id: row.currentTask.id, title: row.currentTask.title }
        : null,
    };
  }
}
