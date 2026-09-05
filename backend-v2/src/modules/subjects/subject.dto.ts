import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";
export class CreateSubjectDto{@IsString()@Length(1,80)code!:string;@IsString()@Length(2,160)name!:string;@IsOptional()@IsUUID()organizationId?:string;}
export class UpdateSubjectDto{@IsOptional()@IsString()@Length(2,160)name?:string;@IsOptional()@IsBoolean()active?:boolean;}
export class UpdateStudentSubjectDto{@IsOptional()@IsBoolean()enabled?:boolean;@IsOptional()@IsString()@Length(0,120)displayName?:string;@IsOptional()@IsInt()@Min(0)weeklyTargetMinutes?:number;}
