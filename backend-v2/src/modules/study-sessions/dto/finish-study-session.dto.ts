import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class FinishStudySessionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  actualTests?: number;

  @IsOptional()
  @IsString()
  @Max(64)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @Max(2000)
  note?: string;
}