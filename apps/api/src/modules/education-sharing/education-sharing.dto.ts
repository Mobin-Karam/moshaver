import { IsDateString, IsOptional, IsUUID } from "class-validator";
export class ShareEducationDto {
  @IsUUID() targetStudentId!: string;
  @IsOptional() @IsDateString() date?: string;
}
