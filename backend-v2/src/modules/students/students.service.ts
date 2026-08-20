import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlanStatus } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { User, UserRole } from "../../database/entities/user.entity";
import { ApiException } from "../../common/exceptions/api.exception";

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(User) private readonly users: Repository<User>,
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
    await this.students.delete(id);
    if (student.user) await this.users.delete(student.user.id);
    return { id, deleted: true };
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
    const today = await this.today(userId);
    const completed = today.tasks.filter((task) => task.completedAt).length;
    return { studentId: today.student?.id || null, completed, total: today.tasks.length, percent: today.tasks.length ? Math.round((completed / today.tasks.length) * 100) : 0 };
  }

  async reviews(userId?: string) {
    const student = userId ? await this.findByUserId(userId) : null;
    return { studentId: student?.id || null, items: [] };
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

  async completeTask(id: string) {
    await this.tasks.update(id, { completedAt: new Date() });
    return { id, completedAt: new Date() };
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
}
