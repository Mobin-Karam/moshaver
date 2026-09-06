import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";

export class CreateQuestionDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsArray()
  options!: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  correctOption?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateExamDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

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
  @IsDateString()
  openAt?: string;

  @IsOptional()
  @IsDateString()
  closeAt?: string;

  @IsOptional()
  @IsString()
  isoDate?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsIn(["standard", "konkur"])
  mode?: "standard" | "konkur";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @IsOptional()
  @IsBoolean()
  allowBackNavigation?: boolean;

  @IsOptional()
  @IsObject()
  scoring?: { correct: number; wrong: number; unanswered: number; negativeMarking: boolean };

  @IsOptional()
  @IsIn(["immediate", "scheduled", "manual"])
  resultPolicy?: "immediate" | "scheduled" | "manual";

  @IsOptional()
  @IsDateString()
  resultReleaseAt?: string;

  @IsOptional()
  @IsBoolean()
  resultsReleased?: boolean;

  @IsOptional()
  @IsArray()
  sections?: Array<{ id: string; name: string; questionIds: string[]; allocatedMinutes?: number }>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class AssignExamDto { @IsArray() @IsUUID("4", { each: true }) studentIds!: string[]; }
