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

@Module({ imports: [TypeOrmModule.forFeature([Student, Plan, StudySession, ExamAttempt, Notification, SyncMutation]), TasksModule, StudySessionsModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
