import { ArrayUnique, IsArray, IsEnum, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { OrganizationStatus, OrganizationType } from "../../../database/entities/organization.entity";

export class CreateOrganizationDto { @IsString() @Length(2, 180) name!: string; @IsEnum(OrganizationType) type!: OrganizationType; }
export class UpdateOrganizationDto { @IsOptional() @IsString() @Length(2, 180) name?: string; @IsOptional() @IsEnum(OrganizationType) type?: OrganizationType; @IsOptional() @IsEnum(OrganizationStatus) status?: OrganizationStatus; }
export class AddMemberDto { @IsUUID() userId!: string; @IsArray() @ArrayUnique() @IsString({ each: true }) roleCodes!: string[]; }
export class UpdateMemberDto { @IsOptional() @IsIn(["ACTIVE", "INACTIVE"]) status?: "ACTIVE" | "INACTIVE"; @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) roleCodes?: string[]; }
