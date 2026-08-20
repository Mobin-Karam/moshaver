import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TaskType } from "../../../database/entities/task.entity";

export class ImportTaskDto {
  @IsEnum(TaskType)
  type!: TaskType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  duration?: number;

  @IsOptional()
  testCount?: number;

  @IsOptional()
  priority?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportPlanDto {
  @IsString()
  studentId!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTaskDto)
  tasks!: ImportTaskDto[];

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
