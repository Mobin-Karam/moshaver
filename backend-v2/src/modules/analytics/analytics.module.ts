import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Recommendation, Student, User } from "../../database/entities";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AnalyticsController } from "./analytics.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Student, Recommendation, User]), AuthorizationModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
