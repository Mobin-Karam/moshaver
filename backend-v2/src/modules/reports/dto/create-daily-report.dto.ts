import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateDailyReportDto {
  @IsDateString()
  planDate!: string;

  @IsInt()
  @Min(0)
  @Max(10)
  focus!: number;

  @IsInt()
  @Min(0)
  @Max(10)
  fatigue!: number;

  @IsInt()
  @Min(0)
  @Max(10)
  motivation!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  problem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tomorrow?: string;
}