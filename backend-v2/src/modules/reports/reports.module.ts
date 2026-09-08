import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DailyReport } from "../../database/entities/daily-report.entity";
import { RecoveryRequest } from "../../database/entities/recovery-request.entity";
import { Student } from "../../database/entities/student.entity";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { AuthorizationModule } from "../authorization/authorization.module";
import { User } from "../../database/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DailyReport, RecoveryRequest, Student, User]), AuthorizationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
