import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Exam } from "../../database/entities/exam.entity";
import { Question } from "../../database/entities/question.entity";
import { Student } from "../../database/entities/student.entity";
import { ExamsController } from "./exams.controller";
import { ExamsService } from "./exams.service";
import { ExamAssignment, Organization, User } from "../../database/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Question, ExamAttempt, ExamAssignment, Student, User, Organization])],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
