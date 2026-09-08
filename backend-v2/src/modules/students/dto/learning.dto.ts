import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { LearningStatus } from "../../../database/entities/learning-item.entity";
export class CreateLearningItemDto{@IsString()@Length(2,2000)title!:string;@IsOptional()@IsString()@Length(0,120)subject?:string;@IsOptional()@IsString()@Length(0,120)book?:string;@IsOptional()@IsString()@Length(0,120)chapter?:string;@IsOptional()@IsString()@Length(0,120)lesson?:string;@IsOptional()@IsString()@Length(0,120)topic?:string;@IsOptional()@IsString()@Length(0,5000)note?:string;@IsOptional()@IsString()@Length(0,5000)hint?:string;@IsOptional()@IsString()dueDate?:string;}
export class UpdateLearningItemDto extends CreateLearningItemDto{@IsOptional()declare title:string;@IsOptional()@IsEnum(LearningStatus)status?:LearningStatus;}
export class ReviewLearningItemDto{@IsNumber()@Min(0)@Max(5)rating!:number;}
