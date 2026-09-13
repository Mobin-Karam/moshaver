import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class FinishStudySessionDto {
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
