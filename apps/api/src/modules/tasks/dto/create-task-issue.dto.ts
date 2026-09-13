import { IsOptional, IsString, Length } from "class-validator";

export class CreateTaskIssueDto {
  @IsString()
  @Length(1, 120)
  type!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}