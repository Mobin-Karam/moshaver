import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Notification } from "../../database/entities/notification.entity";
import { Plan } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { StudySession } from "../../database/entities/study-session.entity";
import { SyncMutation } from "../../database/entities/sync-mutation.entity";
import { TasksModule } from "../tasks/tasks.module";
import { StudySessionsModule } from "../study-sessions/study-sessions.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { Exam, ExamAssignment, LearningItem, LearningReview, Task } from "../../database/entities";
import { ReportsModule } from "../reports/reports.module";
import { StudentsModule } from "../students/students.module";
import { ExamsModule } from "../exams/exams.module";

@Module({ imports: [TypeOrmModule.forFeature([Student, Plan, StudySession, ExamAttempt, Notification, SyncMutation, Task, Exam, ExamAssignment, LearningItem, LearningReview]), TasksModule, StudySessionsModule, ReportsModule, StudentsModule, ExamsModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
