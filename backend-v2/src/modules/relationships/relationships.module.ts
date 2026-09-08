import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Organization, Student, User, UserRelationship } from "../../database/entities";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";
@Module({ imports: [TypeOrmModule.forFeature([UserRelationship, User, Student, Organization])], controllers: [RelationshipsController], providers: [RelationshipsService], exports: [RelationshipsService] })
export class RelationshipsModule {}
