import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DailyReport } from "../../database/entities/daily-report.entity";
import { RecoveryRequest } from "../../database/entities/recovery-request.entity";
import { Student } from "../../database/entities/student.entity";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [TypeOrmModule.forFeature([DailyReport, RecoveryRequest, Student])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}