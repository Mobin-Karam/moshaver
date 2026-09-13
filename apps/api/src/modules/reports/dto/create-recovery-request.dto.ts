import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateRecoveryRequestDto {
  @IsOptional()
  @IsDateString()
  planDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  note?: string;
}