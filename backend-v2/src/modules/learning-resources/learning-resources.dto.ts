import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class SaveLearningResourceDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsIn(["LINK", "VIDEO"]) type!: "LINK" | "VIDEO";
  @IsUrl({ protocols: ["https"], require_protocol: true }) @MaxLength(1200) url!: string;
  @IsOptional() @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"]) status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  @IsArray() @ArrayUnique() @ArrayMaxSize(500) @IsString({ each: true }) studentIds!: string[];
}
