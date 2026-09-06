import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Organization,
  OrganizationMembership,
  Student,
  StudentSubject,
  Subject,
  TeacherSubjectAssignment,
  User,
  UserRoleAssignment,
} from "../../database/entities";
import { SubjectsController } from "./subjects.controller";
import { SubjectsService } from "./subjects.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subject,
      StudentSubject,
      Student,
      Organization,
      TeacherSubjectAssignment,
      OrganizationMembership,
      UserRoleAssignment,
      User,
    ]),
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
