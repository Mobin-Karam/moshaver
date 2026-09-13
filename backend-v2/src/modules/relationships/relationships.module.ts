import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization, OrganizationMembership, Student, User, UserRelationship, UserRoleAssignment } from "../../database/entities";
import { NotificationsModule } from "../notifications/notifications.module";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";
@Module({ imports: [TypeOrmModule.forFeature([UserRelationship, User, Student, Organization, OrganizationMembership, UserRoleAssignment]), NotificationsModule], controllers: [RelationshipsController], providers: [RelationshipsService], exports: [RelationshipsService] })
export class RelationshipsModule {}
