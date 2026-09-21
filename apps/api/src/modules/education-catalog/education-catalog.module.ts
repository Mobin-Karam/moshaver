import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EducationBook } from "../../database/entities/education-book.entity";
import { EducationCatalogController } from "./education-catalog.controller";
import { EducationCatalogService } from "./education-catalog.service";

@Module({ imports: [TypeOrmModule.forFeature([EducationBook])], controllers: [EducationCatalogController], providers: [EducationCatalogService], exports: [EducationCatalogService] })
export class EducationCatalogModule {}
