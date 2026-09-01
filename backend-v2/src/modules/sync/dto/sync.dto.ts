import { Type } from "class-transformer";
import { IsArray, IsISO8601, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

export class SyncChangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  id!: string;

  @IsIn(["POST", "PATCH"])
  method!: "POST" | "PATCH";

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  path!: string;

  @IsOptional()
  body?: unknown;

  @IsOptional()
  @IsISO8601()
  createdAt?: string;
}

export class UploadSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChangeDto)
  changes!: SyncChangeDto[];
}