import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { Plan, PlanStatus } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { Task, TaskType } from "../../database/entities/task.entity";
import { ImportPlanDto } from "./dto/import-plan.dto";

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  async list(studentId: string, from: string, to: string) {
    const plans = await this.plans.find({
      where: { student: { id: studentId }, date: Between(from, to) },
      relations: { tasks: true },
      order: { date: "ASC", createdAt: "ASC" },
    });
    return plans.map((plan) => this.presentPlan(plan));
  }

  async previewImport(dto: ImportPlanDto) {
    const warnings: string[] = [];
    if (!dto.tasks?.length) warnings.push("هیچ فعالیتی در برنامه نیست.");
    for (const [index, task] of (dto.tasks || []).entries()) {
      if (!task.startTime || !task.endTime) warnings.push(`فعالیت ${index + 1} زمان شروع یا پایان ندارد.`);
      if (task.startTime && task.endTime && task.startTime >= task.endTime) warnings.push(`فعالیت ${index + 1} بازه زمانی نامعتبر دارد.`);
    }
    return { valid: true, plan: dto, warnings, summary: { taskCount: dto.tasks?.length || 0, date: dto.date } };
  }

  async importPlan(dto: ImportPlanDto) {
    return this.upsertPlan(dto);
  }

  async upsertPlan(dto: ImportPlanDto) {
    const student = await this.students.findOneByOrFail({ id: dto.studentId });
    const existing = await this.plans.findOne({ where: { student: { id: dto.studentId }, date: dto.date }, relations: { tasks: true } });
    if (existing) {
      await this.tasks.delete({ plan: { id: existing.id } });
      existing.status = dto.publish ? PlanStatus.PUBLISHED : existing.status;
      existing.tasks = this.createTasks(dto.tasks || []);
      return this.presentPlan(await this.plans.save(existing));
    }

    const plan = await this.plans.save(
      this.plans.create({
        student,
        date: dto.date,
        status: dto.publish ? PlanStatus.PUBLISHED : PlanStatus.DRAFT,
        tasks: this.createTasks(dto.tasks || []),
      }),
    );
    return this.presentPlan(plan);
  }

  async publishRange(studentId: string, from: string, to: string, published: boolean) {
    const plans = await this.plans.find({ where: { student: { id: studentId }, date: Between(from, to) } });
    for (const plan of plans) {
      plan.status = published ? PlanStatus.PUBLISHED : PlanStatus.DRAFT;
    }
    await this.plans.save(plans);
    return { updated: plans.length };
  }

  async importPayload(body: { studentId: string; data?: unknown; publishImported?: boolean }) {
    const imported = normalizeImportPayload(body);
    const results = [];
    for (const plan of imported.plans) {
      results.push(await this.upsertPlan({ ...plan, studentId: body.studentId, publish: body.publishImported }));
    }
    return { importedPlans: results.length, plans: results };
  }

  previewPayload(body: { studentId: string; data?: unknown }) {
    const imported = normalizeImportPayload(body);
    return {
      valid: true,
      errors: [],
      warnings: imported.plans.length ? [] : ["هیچ برنامه‌ای برای وارد کردن پیدا نشد."],
      summary: { planCount: imported.plans.length, taskCount: imported.plans.reduce((sum, plan) => sum + plan.tasks.length, 0) },
      normalized: imported,
    };
  }

  private createTasks(tasks: ImportPlanDto["tasks"]) {
    return tasks.map((task, index) =>
      this.tasks.create({
        type: task.type || TaskType.STUDY,
        title: task.title,
        subject: task.subject || "",
        description: task.description || task.note || "",
        startTime: task.startTime || "",
        endTime: task.endTime || "",
        duration: Number(task.duration || durationMinutes(task.startTime, task.endTime) || 0),
        testCount: Number(task.testCount || 0),
        note: task.note || "",
        priority: Number(task.priority ?? index),
      }),
    );
  }

  private presentPlan(plan: Plan) {
    const tasks = [...(plan.tasks || [])].sort((left, right) => left.priority - right.priority || left.startTime.localeCompare(right.startTime));
    return {
      id: plan.id,
      date: plan.date,
      planDate: plan.date,
      persianDate: plan.date,
      status: plan.status,
      published: plan.status === PlanStatus.PUBLISHED,
      title: "برنامه روزانه",
      tasks,
    };
  }
}

function normalizeImportPayload(body: { studentId: string; data?: unknown }): { plans: ImportPlanDto[] } {
  const data = body.data as { plans?: Array<Record<string, unknown>>; date?: string; tasks?: unknown[] } | undefined;
  const rawPlans = Array.isArray(data?.plans) ? data.plans : data?.date ? [data as Record<string, unknown>] : [];
  return {
    plans: rawPlans.map((plan) => ({
      studentId: body.studentId,
      date: String(plan.date || plan.planDate || plan.isoDate || new Date().toISOString().slice(0, 10)),
      publish: Boolean(plan.publish || plan.published),
      tasks: normalizeTasks(plan.tasks),
    })),
  };
}

function normalizeTasks(value: unknown): ImportPlanDto["tasks"] {
  if (!Array.isArray(value)) return [];
  return value.map((task, index) => {
    const item = task as Record<string, unknown>;
    return {
      type: normalizeTaskType(item.type),
      title: String(item.title || item.subject || "فعالیت"),
      subject: String(item.subject || ""),
      description: String(item.description || ""),
      startTime: String(item.startTime || item.start || ""),
      endTime: String(item.endTime || item.end || ""),
      duration: Number(item.duration || item.durationMinutes || 0),
      testCount: Number(item.testCount || item.tests || 0),
      priority: Number(item.priority ?? index),
      note: String(item.note || ""),
    };
  });
}

function normalizeTaskType(value: unknown) {
  const normalized = String(value || "STUDY").toUpperCase();
  return Object.values(TaskType).includes(normalized as TaskType) ? (normalized as TaskType) : TaskType.STUDY;
}

function durationMinutes(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh = "0", sm = "0"] = start.split(":");
  const [eh = "0", em = "0"] = end.split(":");
  return Math.max(0, Number(eh) * 60 + Number(em) - (Number(sh) * 60 + Number(sm)));
}
