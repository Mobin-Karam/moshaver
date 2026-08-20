import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateQuestionDto {
  @IsString()
  text!: string;

  @IsArray()
  options!: string[];

  @IsString()
  correctAnswer!: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CreateExamDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsNumber()
  @Min(1)
  duration!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  attemptLimit?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
