import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

export class StudentSignupDto {
  @IsString() @MinLength(3) @MaxLength(120) @Matches(/^[a-zA-Z0-9._-]+$/) username!: string;
  @IsString() @MinLength(12) @MaxLength(300) password!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MaxLength(80) grade!: string;
  @IsString() @MaxLength(80) major!: string;
}
export class AssignStudentOnboardingDto {
  @IsOptional() @IsIn(["AUTO", "MANUAL"]) mode?: "AUTO" | "MANUAL";
  @ValidateIf((value) => value.mode !== "AUTO") @IsUUID() organizationId?: string;
  @ValidateIf((value) => value.mode !== "AUTO") @IsUUID() advisorUserId?: string;
}
