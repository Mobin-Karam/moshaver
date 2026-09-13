import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ExamAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsIn(["a", "b", "c", "d"])
  selectedOption?: string | null;

  @IsOptional()
  @IsBoolean()
  marked?: boolean;

  @IsOptional()
  @IsBoolean()
  visited?: boolean;

  @IsOptional()
  @IsDateString()
  clientUpdatedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  revision?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  approximateTimeSpentSeconds?: number;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[] = [];
}

export class ExamHeartbeatDto {
  @IsOptional()
  @IsString()
  currentSectionId?: string;
}
