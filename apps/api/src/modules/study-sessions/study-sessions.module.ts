import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../../database/entities/student.entity";
import { StudySession } from "../../database/entities/study-session.entity";
import { Task } from "../../database/entities/task.entity";
import { UserRelationship } from "../../database/entities/user-relationship.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { StudySessionsController } from "./study-sessions.controller";
import { StudySessionsService } from "./study-sessions.service";

@Module({
  imports: [TypeOrmModule.forFeature([StudySession, Student, Task, UserRelationship]), NotificationsModule],
  controllers: [StudySessionsController],
  providers: [StudySessionsService],
  exports: [StudySessionsService],
})
export class StudySessionsModule {}
