import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LearningResource, LearningResourceAssignment, Student } from "../../database/entities";
import { AuthorizationModule } from "../authorization/authorization.module";
import { LearningResourcesController } from "./learning-resources.controller";
import { LearningResourcesService } from "./learning-resources.service";
@Module({ imports: [TypeOrmModule.forFeature([LearningResource, LearningResourceAssignment, Student]), AuthorizationModule], controllers: [LearningResourcesController], providers: [LearningResourcesService] })
export class LearningResourcesModule {}
