import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization, OrganizationMembership, Role, User, UserRoleAssignment } from "../../database/entities";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
@Module({ imports: [TypeOrmModule.forFeature([Organization, OrganizationMembership, User, Role, UserRoleAssignment])], controllers: [OrganizationsController], providers: [OrganizationsService] })
export class OrganizationsModule {}
