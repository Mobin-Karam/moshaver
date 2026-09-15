import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam, ExamAssignment, ExamAttempt, ExamRetryRequest, ExamSyllabus, Quiz, QuizAttempt, QuizQuestion, Student, SyllabusProgress } from "../../database/entities";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";
@Module({imports:[TypeOrmModule.forFeature([Exam,ExamAssignment,ExamAttempt,ExamSyllabus,SyllabusProgress,ExamRetryRequest,Quiz,QuizQuestion,QuizAttempt,Student]),AuthorizationModule],controllers:[AssessmentsController],providers:[AssessmentsService]})
export class AssessmentsModule{}
