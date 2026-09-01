import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { TaskComment } from "../../database/entities/task-comment.entity";
import { TaskIssue } from "../../database/entities/task-issue.entity";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({ imports: [TypeOrmModule.forFeature([Student, Task, TaskComment, TaskIssue])], controllers: [TasksController], providers: [TasksService], exports: [TasksService] })
export class TasksModule {}
