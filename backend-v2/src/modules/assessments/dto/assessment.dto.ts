import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { RetryRequestStatus } from "../../../database/entities/exam-retry-request.entity";
import { SyllabusProgressStatus } from "../../../database/entities/syllabus-progress.entity";

export class SyllabusDto { @IsString() subject!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsBoolean() required?: boolean; @IsOptional() @IsString() track?: string; }
export class SyllabusProgressDto { @IsEnum(SyllabusProgressStatus) status!: SyllabusProgressStatus; @IsOptional() @IsInt() @Min(0) @Max(100) accuracy?: number; @IsOptional() @IsString() note?: string; }
export class RetryRequestDto { @IsOptional() @IsString() message?: string; }
export class ModerateRetryDto { @IsEnum(RetryRequestStatus) status!: RetryRequestStatus; @IsOptional() @IsString() note?: string; }
export class QuizQuestionDto { @IsString() text!: string; @IsArray() @IsString({each:true}) options!: string[]; @IsString() correctAnswer!: string; @IsOptional() @IsString() explanation?: string; @IsOptional() @IsInt() sortOrder?: number; }
export class CreateQuizDto { @IsString() title!: string; @IsOptional() @IsString() subject?: string; @IsOptional() @IsInt() @Min(1) durationMinutes?: number; @IsOptional() @IsUUID() examId?: string; @IsOptional() @IsUUID() organizationId?: string; @IsOptional() @IsBoolean() active?: boolean; }
export class UpdateQuizDto { @IsOptional() @IsString() title?: string; @IsOptional() @IsString() subject?: string; @IsOptional() @IsInt() @Min(1) durationMinutes?: number; @IsOptional() @IsBoolean() active?: boolean; }
export class QuizAnswerDto { @IsUUID() questionId!: string; @IsOptional() @IsString() selectedOption?: string | null; }
export class SubmitQuizDto { @IsUUID() runId!: string; @IsArray() @ValidateNested({each:true}) @Type(() => QuizAnswerDto) answers!: QuizAnswerDto[]; }
