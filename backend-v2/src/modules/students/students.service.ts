import { Injectable, Optional } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { PlanStatus } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { TopicMastery } from "../../database/entities/topic-mastery.entity";
import { User, UserRole } from "../../database/entities/user.entity";
import { ApiException } from "../../common/exceptions/api.exception";
import { LearningItem, LearningStatus } from "../../database/entities/learning-item.entity";
import { LearningReview } from "../../database/entities/learning-review.entity";
import { Session } from "../../database/entities/session.entity";

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TopicMastery) private readonly mastery: Repository<TopicMastery>,
    @InjectRepository(LearningItem) private readonly learningItems: Repository<LearningItem>,
    @InjectRepository(LearningReview) private readonly learningReviews: Repository<LearningReview>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  list() {
    return this.students.find({ relations: { user: true }, order: { createdAt: "DESC" } });
  }

  async create(dto: {
    name?: string;
    username?: string;
    password?: string;
    grade?: string;
    major?: string;
    targetUniversity?: string;
    targetField?: string;
    targetRank?: string;
    dailyCapacity?: string;
  }) {
    const username = String(dto.username || "").trim();
    const name = String(dto.name || username || "").trim();
    if (!username) throw new ApiException(400, "USERNAME_REQUIRED", "نام کاربری دانش‌آموز الزامی است.");
    if (!name) throw new ApiException(400, "NAME_REQUIRED", "نام دانش‌آموز الزامی است.");
    const exists = await this.users.findOne({ where: { username } });
    if (exists) throw new ApiException(409, "USERNAME_EXISTS", "این نام کاربری قبلاً ثبت شده است.");
    const user = await this.users.save(
      this.users.create({
        username,
        passwordHash: await bcrypt.hash(String(dto.password || "12345678"), 10),
        role: UserRole.STUDENT,
      }),
    );
    const student = await this.students.save(
      this.students.create({
        user,
        name,
        grade: dto.grade || "",
        major: dto.major || "",
        targetUniversity: dto.targetUniversity || "",
        targetField: dto.targetField || "",
        targetRank: dto.targetRank || "",
        dailyCapacity: dto.dailyCapacity || "",
      }),
    );
    return this.findStudent(student.id);
  }

  async find(id: string) {
    return (await this.findStudent(id)) || this.findByUserId(id);
  }

  findStudent(id: string) {
    return this.students.findOne({ where: { id }, relations: { user: true, plans: { tasks: true } } });
  }

  async update(id: string, dto: Partial<Student> & { username?: string; password?: string }) {
    const student = await this.findStudent(id);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    await this.students.update(id, {
      name: dto.name ?? student.name,
      grade: dto.grade ?? student.grade,
      major: dto.major ?? student.major,
      targetUniversity: dto.targetUniversity ?? student.targetUniversity,
      targetField: dto.targetField ?? student.targetField,
      targetRank: dto.targetRank ?? student.targetRank,
      dailyCapacity: dto.dailyCapacity ?? student.dailyCapacity,
    });
    if (student.user && (dto.username || dto.password)) {
      await this.users.update(student.user.id, {
        username: dto.username ?? student.user.username,
        ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
      });
    }
    return this.findStudent(id);
  }

  async remove(id: string) {
    const student = await this.findStudent(id);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    await this.students.update(id, { accountStatus: "archived" });
    if (student.user) await this.sessions.delete({ user: { id: student.user.id } });
    return { id, archived: true };
  }

  async lifecycle(id: string, action: "activate" | "deactivate" | "restore" | "force-logout") {
    const student = await this.findStudent(id);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    if (action === "force-logout") {
      if (student.user) await this.sessions.delete({ user: { id: student.user.id } });
      return { id, sessionsRevoked: true };
    }
    const accountStatus = action === "deactivate" ? "inactive" : "active";
    await this.students.update(id, { accountStatus });
    if (accountStatus !== "active" && student.user) await this.sessions.delete({ user: { id: student.user.id } });
    return this.findStudent(id);
  }

  async resetPassword(id: string, password: string) {
    if (password.length < 8) throw new ApiException(400, "PASSWORD_TOO_SHORT", "رمز عبور باید حداقل ۸ نویسه باشد.");
    const student = await this.findStudent(id);
    if (!student?.user) throw new ApiException(404, "STUDENT_USER_NOT_FOUND", "حساب دانش‌آموز پیدا نشد.");
    await this.users.update(student.user.id, { passwordHash: await bcrypt.hash(password, 10) });
    await this.sessions.delete({ user: { id: student.user.id } });
    return { id, passwordReset: true, sessionsRevoked: true };
  }

  async weeklyForStudent(id: string) {
    const student = await this.findStudent(id);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return this.progressForStudent(student);
  }

  async topicsForStudent(id: string, limit = 8) {
    await this.requireStudent(id);
    return this.mastery.find({ where: { studentId: id }, order: { score: "ASC", topic: "ASC" }, take: Math.min(Math.max(limit, 1), 100) });
  }

  async learningForStudent(id: string) {
    await this.requireStudent(id);
    const items = await this.learningItems.find({ where: { student: { id } }, order: { dueDate: "ASC", createdAt: "DESC" } });
    return { summary: this.learningSummary(items), items: items.map((item) => this.publicLearningItem(item, id)) };
  }

  async createLearningItem(id: string, body: Partial<LearningItem>) {
    const student = await this.requireStudent(id);
    const title = String(body.title || "").trim();
    if (title.length < 2) throw new ApiException(400, "LEARNING_TITLE_REQUIRED", "عنوان یادگیری الزامی است.");
    const item = this.learningItems.create({ student, ...this.learningInput(body), title });
    return this.publicLearningItem(await this.learningItems.save(item), id);
  }

  async updateLearningItem(studentId: string, itemId: string, body: Partial<LearningItem>) {
    const item = await this.learningItems.findOne({ where: { id: itemId, student: { id: studentId } }, relations: { student: true } });
    if (!item) throw new ApiException(404, "LEARNING_ITEM_NOT_FOUND", "مورد یادگیری پیدا نشد.");
    const previousMastery = item.mastery;
    const previousIntervalDays = item.intervalDays;
    Object.assign(item, this.learningInput(body));
    if (body.title !== undefined) item.title = String(body.title).trim();
    if (item.status === LearningStatus.DONE && !item.completedAt) item.completedAt = new Date();
    if (item.status !== LearningStatus.DONE) item.completedAt = null;
    const saved = await this.learningItems.save(item);
    if (body.mastery !== undefined && saved.mastery !== previousMastery) {
      await this.learningReviews.save(this.learningReviews.create({ item: saved, rating: saved.mastery, previousMastery, newMastery: saved.mastery, previousIntervalDays, nextIntervalDays: saved.intervalDays, nextReviewAt: saved.dueDate }));
      await this.learningItems.increment({ id: saved.id }, "reviewCount", 1);
      saved.reviewCount += 1;
    }
    return this.publicLearningItem(saved, studentId);
  }

  async deleteLearningItem(studentId: string, itemId: string) {
    const result = await this.learningItems.delete({ id: itemId, student: { id: studentId } });
    if (!result.affected) throw new ApiException(404, "LEARNING_ITEM_NOT_FOUND", "مورد یادگیری پیدا نشد.");
    return { id: itemId, deleted: true };
  }

  async learningReviewHistory(studentId: string, itemId: string, limit = 50) {
    const item = await this.learningItems.findOne({ where: { id: itemId, student: { id: studentId } } });
    if (!item) throw new ApiException(404, "LEARNING_ITEM_NOT_FOUND", "مورد یادگیری پیدا نشد.");
    return this.learningReviews.find({ where: { item: { id: itemId } }, order: { reviewedAt: "DESC" }, take: Math.min(Math.max(limit, 1), 100) });
  }

  async studentIdForUser(userId: string) {
    const student = await this.findByUserId(userId);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return student.id;
  }

  async reviewLearningItem(studentId: string, itemId: string, rating: number) {
    const run = async (items: Repository<LearningItem>, reviews: Repository<LearningReview>) => {
      const item = await items.findOne({ where: { id: itemId, student: { id: studentId } }, relations: { student: true } });
      if (!item) throw new ApiException(404, "LEARNING_ITEM_NOT_FOUND", "مورد یادگیری پیدا نشد.");
      const previousMastery = item.mastery;
      const previousIntervalDays = item.intervalDays;
      const safeRating = Math.min(5, Math.max(0, Number(rating)));
      item.mastery = Math.round((previousMastery * 0.6 + safeRating * 0.4) * 10) / 10;
      item.intervalDays = safeRating < 2 ? 1 : Math.max(1, Math.round(previousIntervalDays * (safeRating >= 4 ? 2 : 1.4)));
      item.dueDate = this.addDays(new Date().toISOString().slice(0, 10), item.intervalDays);
      item.reviewCount += 1;
      item.status = LearningStatus.PENDING;
      const saved = await items.save(item);
      const review = await reviews.save(reviews.create({ item: saved, rating: safeRating, previousMastery, newMastery: saved.mastery, previousIntervalDays, nextIntervalDays: saved.intervalDays, nextReviewAt: saved.dueDate }));
      return { item: this.publicLearningItem(saved, studentId), review };
    };
    return this.dataSource ? this.dataSource.transaction((manager) => run(manager.getRepository(LearningItem), manager.getRepository(LearningReview))) : run(this.learningItems, this.learningReviews);
  }

  async dashboard(userId?: string) {
    const today = await this.today(userId);
    const completed = today.tasks.filter((task) => task.completedAt).length;
    return {
      student: today.student,
      plan: today.plan,
      tasks: today.tasks,
      metrics: {
        completed,
        total: today.tasks.length,
        percent: today.tasks.length ? Math.round((completed / today.tasks.length) * 100) : 0,
      },
      healthScore: null,
      risk: "unknown",
      todayStatus: completed > 0 ? "in_progress" : "not_started",
      recommendations: [],
    };
  }

  async today(userId?: string) {
    return this.day(userId, new Date().toISOString().slice(0, 10));
  }

  async day(userId?: string, isoDate?: string) {
    if (!userId) return { student: null, plan: null, tasks: [] };
    const student = await this.findByUserId(userId);
    const date = isoDate || new Date().toISOString().slice(0, 10);
    const plan = student?.plans?.find((item) => item.date === date && item.status === PlanStatus.PUBLISHED) || null;
    return { student: this.publicStudent(student), plan, tasks: this.sortTasks(plan?.tasks || []) };
  }

  async progress(userId?: string) {
    const student = userId ? await this.findByUserId(userId) : null;
    const today = new Date().toISOString().slice(0, 10);
    const from = this.addDays(today, -6);
    const days = (student?.plans || [])
      .filter((plan) => plan.status === PlanStatus.PUBLISHED && plan.date >= from && plan.date <= today)
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((plan) => this.taskMetrics(plan.date, plan.tasks || []));
    const summary = days.reduce((result, day) => ({ completed: result.completed + day.completed, total: result.total + day.total }), { completed: 0, total: 0 });
    return {
      studentId: student?.id || null,
      completed: summary.completed,
      total: summary.total,
      percent: summary.total ? Math.round((summary.completed / summary.total) * 100) : 0,
      from,
      to: today,
      days,
    };
  }

  async reviews(userId?: string) {
    const student = userId ? await this.findByUserId(userId) : null;
    const items = (student?.plans || [])
      .flatMap((plan) => (plan.status === PlanStatus.PUBLISHED ? plan.tasks || [] : []))
      .filter((task) => task.type === "REVIEW")
      .sort((left, right) => (left.plan?.date || "").localeCompare(right.plan?.date || "") || left.priority - right.priority);
    return { studentId: student?.id || null, items };
  }

  async learning(userId?: string) {
    const student = userId ? await this.findByUserId(userId) : null;
    const items = student ? await this.mastery.find({ where: { studentId: student.id }, order: { score: "ASC", topic: "ASC" } }) : [];
    return {
      studentId: student?.id || null,
      summary: { total: items.length, averageScore: items.length ? Math.round((items.reduce((sum, item) => sum + item.score, 0) / items.length) * 10) / 10 : 0 },
      items,
    };
  }

  async dashboardForStudent(studentId: string) {
    const student = await this.findStudent(studentId);
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    const today = new Date().toISOString().slice(0, 10);
    const plan = student.plans?.find((item) => item.date === today && item.status === PlanStatus.PUBLISHED) || null;
    const tasks = this.sortTasks(plan?.tasks || []);
    const completed = tasks.filter((task) => task.completedAt).length;
    return {
      student: this.publicStudent(student),
      todayPlan: plan,
      plan,
      tasks,
      progress: {
        completed,
        total: tasks.length,
        percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      },
      metrics: {
        completed,
        total: tasks.length,
        percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      },
      healthScore: null,
      risk: "unknown",
      todayStatus: completed > 0 ? "in_progress" : "not_started",
      recommendations: [],
      alerts: [],
    };
  }

  private findByUserId(userId: string) {
    return this.students.findOne({ where: { user: { id: userId } }, relations: { user: true, plans: { tasks: true } } });
  }

  private publicStudent(student: Student | null | undefined) {
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      major: student.major,
      targetUniversity: student.targetUniversity,
      targetField: student.targetField,
      targetRank: student.targetRank,
      dailyCapacity: student.dailyCapacity,
    };
  }

  private sortTasks(tasks: Task[]) {
    return [...tasks].sort((left, right) => left.priority - right.priority || left.startTime.localeCompare(right.startTime) || left.title.localeCompare(right.title));
  }

  private taskMetrics(date: string, tasks: Task[]) {
    const completed = tasks.filter((task) => task.completedAt).length;
    return { date, completed, total: tasks.length, percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
  }

  private addDays(isoDate: string, days: number) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private async requireStudent(id: string) {
    const student = await this.students.findOneBy({ id });
    if (!student) throw new ApiException(404, "STUDENT_NOT_FOUND", "پرونده دانش‌آموز پیدا نشد.");
    return student;
  }

  private progressForStudent(student: Student) {
    const today = new Date().toISOString().slice(0, 10);
    const from = this.addDays(today, -6);
    const days = (student.plans || []).filter((plan) => plan.date >= from && plan.date <= today).sort((a, b) => a.date.localeCompare(b.date)).map((plan) => this.taskMetrics(plan.date, plan.tasks || []));
    const totals = days.reduce((sum, day) => ({ completed: sum.completed + day.completed, total: sum.total + day.total }), { completed: 0, total: 0 });
    return { studentId: student.id, from, to: today, days, ...totals, percent: totals.total ? Math.round(totals.completed / totals.total * 100) : 0 };
  }

  private learningInput(body: Partial<LearningItem>) {
    const status = Object.values(LearningStatus).includes(body.status as LearningStatus) ? body.status : LearningStatus.PENDING;
    return { subject: String(body.subject || ""), book: String(body.book || ""), chapter: String(body.chapter || ""), lesson: String(body.lesson || ""), topic: String(body.topic || ""), note: String(body.note || ""), hint: String(body.hint || ""), dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || "")) ? String(body.dueDate) : new Date().toISOString().slice(0, 10), mastery: Math.min(5, Math.max(0, Number(body.mastery || 0))), intervalDays: Math.max(1, Number(body.intervalDays || 1)), status };
  }

  private publicLearningItem(item: LearningItem, studentId: string) {
    return { ...item, student: undefined, studentId };
  }

  private learningSummary(items: LearningItem[]) {
    const today = new Date().toISOString().slice(0, 10);
    const pending = items.filter((item) => item.status === LearningStatus.PENDING);
    const subjectMap = new Map<string, LearningItem[]>();
    for (const item of items) subjectMap.set(item.subject || "بدون درس", [...(subjectMap.get(item.subject || "بدون درس") || []), item]);
    return { totalItems: items.length, pendingItems: pending.length, dueItems: pending.filter((item) => item.dueDate <= today).length, averageMastery: items.length ? Math.round(items.reduce((sum, item) => sum + item.mastery, 0) / items.length * 10) / 10 : 0, attempts: 0, averageExamPercent: 0, lastAttemptAt: null, subjects: [...subjectMap.entries()].map(([subject, rows]) => ({ subject, items: rows.length, due: rows.filter((item) => item.status === LearningStatus.PENDING && item.dueDate <= today).length, mastery: Math.round(rows.reduce((sum, item) => sum + item.mastery, 0) / rows.length * 10) / 10 })), mistakePatterns: [] };
  }
}
