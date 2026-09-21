import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LearningResource, LearningResourceAssignment, OrganizationMembership, Plan, Student, Task } from "../../database/entities";
import { AuthorizationModule } from "../authorization/authorization.module";
import { EducationSharingController } from "./education-sharing.controller";
import { EducationSharingService } from "./education-sharing.service";

@Module({
  imports: [TypeOrmModule.forFeature([Student, OrganizationMembership, Plan, Task, LearningResource, LearningResourceAssignment]), AuthorizationModule],
  controllers: [EducationSharingController],
  providers: [EducationSharingService],
})
export class EducationSharingModule {}
