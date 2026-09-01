import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../../database/entities/student.entity";
import { User } from "../../database/entities/user.entity";
import { TopicMastery } from "../../database/entities/topic-mastery.entity";
import { StudentController, StudentParityController, StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [TypeOrmModule.forFeature([Student, User, TopicMastery])],
  controllers: [StudentController, StudentParityController, StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
