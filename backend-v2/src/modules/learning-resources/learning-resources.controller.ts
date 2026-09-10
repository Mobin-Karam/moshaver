import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { SaveLearningResourceDto } from "./learning-resources.dto";
import { LearningResourcesService } from "./learning-resources.service";

@Controller("learning-resources")
export class LearningResourcesController {
  constructor(private service: LearningResourcesService) {}
  @Get("assigned") @RequireCapabilities("learning_resources.read") assigned(@CurrentUser() user: AuthenticatedUser, @Query("studentId") studentId?: string) { return this.service.listForStudent(user, studentId).then(ok); }
  @Get() @RequireCapabilities("learning_resources.manage") list(@CurrentUser() user: AuthenticatedUser) { return this.service.listManaged(user).then(ok); }
  @Post() @RequireCapabilities("learning_resources.manage") create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveLearningResourceDto) { return this.service.create(user, dto).then(ok); }
  @Patch(":id") @RequireCapabilities("learning_resources.manage") update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SaveLearningResourceDto) { return this.service.update(user, id, dto).then(ok); }
  @Delete(":id") @RequireCapabilities("learning_resources.manage") remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.remove(user, id).then(ok); }
}
