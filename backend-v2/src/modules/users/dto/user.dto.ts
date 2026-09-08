import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from "class-validator";
export class CreateUserDto {
  @IsString() @Length(2, 120) username!: string;
  @IsString() @MinLength(12) password!: string;
  @IsOptional() @IsString() @Length(0, 100) firstName?: string;
  @IsOptional() @IsString() @Length(0, 100) lastName?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) roleCodes!: string[];
}
export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 120) username?: string;
  @IsOptional() @IsString() @Length(0, 100) firstName?: string;
  @IsOptional() @IsString() @Length(0, 100) lastName?: string;
  @IsOptional() @IsString() @Length(2, 12) locale?: string;
  @IsOptional() @IsString() @Length(2, 64) timezone?: string;
}
export class SetRolesDto {
  @IsArray() @ArrayUnique() @IsString({ each: true }) roleCodes!: string[];
  @IsOptional() @IsUUID() organizationId?: string;
}
