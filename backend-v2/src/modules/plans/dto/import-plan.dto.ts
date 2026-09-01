import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { TaskType } from "../../../database/entities/task.entity";

export class ImportTaskDto {
  @IsString()
  type!: TaskType | string;

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
  start?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  end?: string;

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

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  planDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTaskDto)
  tasks!: ImportTaskDto[];

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
