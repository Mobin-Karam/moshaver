import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RelaxationTrack, Student, StudentDailyRelaxation } from "../../database/entities";
import { RelaxationAdminController, RelaxationStudentController } from "./relaxation.controller";
import { RelaxationService } from "./relaxation.service";

@Module({ imports: [TypeOrmModule.forFeature([RelaxationTrack, StudentDailyRelaxation, Student])], controllers: [RelaxationAdminController, RelaxationStudentController], providers: [RelaxationService] })
export class RelaxationModule {}
