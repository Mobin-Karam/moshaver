import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { UserRelationship } from "../../database/entities/user-relationship.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { AuthorizationService } from "./authorization.service";
import { Student } from "../../database/entities/student.entity";

@Global()
@Module({ imports: [TypeOrmModule.forFeature([UserRoleAssignment, OrganizationMembership, UserRelationship, Student])], providers: [AuthorizationService], exports: [AuthorizationService] })
export class AuthorizationModule {}
