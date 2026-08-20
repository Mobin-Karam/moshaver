import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Plan } from "../../database/entities/plan.entity";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { PlansService } from "./plans.service";

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Student, Task])],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
