import { IsEnum, IsOptional, IsUUID } from "class-validator";
import {
  RelationshipStatus,
  RelationshipType,
} from "../../../database/entities/user-relationship.entity";
export class CreateRelationshipDto {
  @IsUUID() fromUserId!: string;
  @IsUUID() toStudentId!: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsEnum(RelationshipType) type!: RelationshipType;
}
export class UpdateRelationshipDto {
  @IsEnum(RelationshipStatus) status!: RelationshipStatus;
}
