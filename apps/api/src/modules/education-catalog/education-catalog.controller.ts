import { Controller, Get, Query } from "@nestjs/common";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { EducationCatalogService } from "./education-catalog.service";

@Controller("education-catalog")
export class EducationCatalogController {
  constructor(private readonly catalog: EducationCatalogService) {}
  @Get("signup-options") signupOptions() { return ok(this.catalog.signupOptions()); }
  @Get("books") books(@Query("grade") grade?: string, @Query("educationTypeId") educationTypeId?: string, @Query("trackId") trackId?: string) {
    return this.catalog.listBooks(grade ? Number(grade) : undefined, educationTypeId, trackId).then(ok);
  }
  @Get("datasets") @RequireCapabilities("subjects.read") datasets() { return ok(this.catalog.datasets()); }
}
