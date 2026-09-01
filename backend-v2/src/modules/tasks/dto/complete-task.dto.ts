import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export enum TaskCompletionStatus {
  DONE = "done",
  PARTIAL = "partial",
  SKIPPED = "skipped",
}

export class CompleteTaskDto {
  @IsOptional()
  @IsEnum(TaskCompletionStatus)
  status?: TaskCompletionStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  actualTests?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}