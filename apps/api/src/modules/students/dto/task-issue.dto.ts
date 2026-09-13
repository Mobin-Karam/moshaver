import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export enum StaffTaskIssueStatus {
  OPEN = "open",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export class UpdateTaskIssueDto {
  @IsEnum(StaffTaskIssueStatus)
  status!: StaffTaskIssueStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  advisorNote?: string;
}
