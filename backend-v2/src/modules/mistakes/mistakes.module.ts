import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Mistake } from "../../database/entities/mistake.entity";
import { Student } from "../../database/entities/student.entity";
import { MistakesController } from "./mistakes.controller";
import { MistakesService } from "./mistakes.service";

@Module({
	imports: [TypeOrmModule.forFeature([Mistake, Student])],
	controllers: [MistakesController],
	providers: [MistakesService],
})
export class MistakesModule {}
