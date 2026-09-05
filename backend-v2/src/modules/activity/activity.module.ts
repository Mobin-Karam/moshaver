import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ActivityEvent,
  Student,
  StudentPresence,
  Task,
} from "../../database/entities";
import { AuthorizationModule } from "../authorization/authorization.module";
import { ActivityController } from "./activity.controller";
import { ActivityService } from "./activity.service";
@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPresence, ActivityEvent, Student, Task]),
    AuthorizationModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
