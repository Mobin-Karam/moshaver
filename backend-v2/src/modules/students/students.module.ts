import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../../database/entities/student.entity";
import { User } from "../../database/entities/user.entity";
import { TopicMastery } from "../../database/entities/topic-mastery.entity";
import { LearningItem } from "../../database/entities/learning-item.entity";
import { LearningReview } from "../../database/entities/learning-review.entity";
import { Session } from "../../database/entities/session.entity";
import { StudentController, StudentParityController, StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { OrganizationMembership, UserRelationship } from "../../database/entities";
import { StudentAdministrationService } from "./student-administration.service";
import { StudentAdministrationController } from "./student-administration.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Student, User, TopicMastery, LearningItem, LearningReview, Session, OrganizationMembership, UserRelationship])],
  controllers: [StudentController, StudentParityController, StudentsController, StudentAdministrationController],
  providers: [StudentsService, StudentAdministrationService],
  exports: [StudentsService],
})
export class StudentsModule {}
