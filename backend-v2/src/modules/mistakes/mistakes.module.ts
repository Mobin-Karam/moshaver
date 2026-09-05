import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Mistake } from "../../database/entities/mistake.entity";
import { Student } from "../../database/entities/student.entity";
import { MistakesController, StaffMistakesController } from "./mistakes.controller";
import { MistakesService } from "./mistakes.service";
import { AuthorizationModule } from "../authorization/authorization.module";

@Module({
  imports: [TypeOrmModule.forFeature([Mistake, Student]), AuthorizationModule],
  controllers: [MistakesController, StaffMistakesController],
	providers: [MistakesService],
})
export class MistakesModule {}
