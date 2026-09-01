import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { TaskComment } from "../../database/entities/task-comment.entity";
import { TaskIssue } from "../../database/entities/task-issue.entity";
import { CompleteTaskDto, TaskCompletionStatus } from "./dto/complete-task.dto";
import { CreateTaskCommentDto } from "./dto/create-task-comment.dto";
import { CreateTaskIssueDto } from "./dto/create-task-issue.dto";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(TaskComment) private readonly comments: Repository<TaskComment>,
    @InjectRepository(TaskIssue) private readonly issues: Repository<TaskIssue>,
  ) {}

  async detail(userId: string, taskId: string) {
    const task = await this.ownedTask(userId, taskId);
    const [comments, issues] = await Promise.all([
      this.comments.find({ where: { task: { id: task.id }, student: { user: { id: userId } } }, order: { createdAt: "ASC" } }),
      this.issues.find({ where: { task: { id: task.id }, student: { user: { id: userId } } }, order: { createdAt: "ASC" } }),
    ]);
    return { task, comments, issues };
  }

  async complete(userId: string, taskId: string, dto: CompleteTaskDto = {}) {
    const task = await this.ownedTask(userId, taskId);
    const completedAt = new Date();
    task.completedAt = completedAt;
    task.status = dto.status || TaskCompletionStatus.DONE;
    if (dto.note !== undefined) task.note = dto.note;
    await this.tasks.save(task);
    return { id: task.id, status: task.status, completedAt, actualTests: dto.actualTests ?? null, difficulty: dto.difficulty ?? "", note: task.note };
  }

  async addComment(userId: string, taskId: string, dto: CreateTaskCommentDto) {
    const { task, student } = await this.taskAndStudent(userId, taskId);
    return this.comments.save(this.comments.create({ task, student, text: dto.text.trim() }));
  }

  async reportIssue(userId: string, taskId: string, dto: CreateTaskIssueDto) {
    const { task, student } = await this.taskAndStudent(userId, taskId);
    return this.issues.save(this.issues.create({ task, student, type: dto.type.trim(), description: dto.description?.trim() || "", status: "OPEN" }));
  }

  private async ownedTask(userId: string, taskId: string) {
    return (await this.taskAndStudent(userId, taskId)).task;
  }

  private async taskAndStudent(userId: string, taskId: string) {
    const student = await this.students.findOne({ where: { user: { id: userId } } });
    const task = student ? await this.tasks.findOne({ where: { id: taskId, plan: { student: { id: student.id } } }, relations: { plan: true } }) : null;
    if (!student || !task) throw new ApiException(404, "TASK_NOT_FOUND", "فعالیت پیدا نشد.");
    return { task, student };
  }
}