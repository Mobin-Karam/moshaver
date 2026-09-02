import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ExamAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  selectedOption?: string | null;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[] = [];
}