import { Module } from "@nestjs/common";
import { PlansModule } from "../plans/plans.module";
import { StudentsModule } from "../students/students.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [StudentsModule, PlansModule],
  controllers: [AdminController],
})
export class AdminModule {}
