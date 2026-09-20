import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { normalizeNationalCode } from "./national-code";

export class StudentSignupDto {
  @Transform(({ value }) => normalizeNationalCode(String(value ?? ""))) @IsString() @Matches(/^\d{10}$/) nationalCode!: string;
  @IsString() @MinLength(12) @MaxLength(300) password!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) grade!: number;
  @IsString() @MaxLength(40) educationTypeId!: string;
  @IsOptional() @IsString() @MaxLength(80) trackId?: string;
}
export class AssignStudentOnboardingDto {
  @IsOptional() @IsIn(["AUTO", "MANUAL"]) mode?: "AUTO" | "MANUAL";
  @ValidateIf((value) => value.mode !== "AUTO") @IsUUID() organizationId?: string;
  @ValidateIf((value) => value.mode !== "AUTO") @IsUUID() advisorUserId?: string;
}
