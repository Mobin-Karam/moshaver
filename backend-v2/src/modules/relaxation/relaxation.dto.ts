import { IsBoolean, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength } from "class-validator";

export class SaveRelaxationTrackDto {
  @IsString() @MinLength(1) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(120) artist?: string;
  @IsUrl({ protocols: ["https"], require_protocol: true }) @MaxLength(1600) url!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class SelectRelaxationTrackDto { @IsUUID() trackId!: string; }
