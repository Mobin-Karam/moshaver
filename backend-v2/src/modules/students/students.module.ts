import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../../database/entities/student.entity";
import { Task } from "../../database/entities/task.entity";
import { User } from "../../database/entities/user.entity";
import { StudentController, StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TypeOrmModule.forFeature([Student, Task, User])],
  controllers: [StudentController, StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
