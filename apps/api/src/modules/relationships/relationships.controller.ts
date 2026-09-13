import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth";
import { CreateRelationshipDto, UpdateRelationshipDto } from "./dto/relationship.dto";
import { RelationshipsService } from "./relationships.service";

@Controller()
export class RelationshipsController {
  constructor(private service: RelationshipsService) {}
  @Get("relationships") list(@CurrentUser() user: AuthenticatedUser) { return this.service.list(user).then(ok); }
  @Post("relationships") @RequireCapabilities("organization.members.manage") create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRelationshipDto) { return this.service.create(user, dto).then(ok); }
  @Get("relationships/:id") get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.get(user, id).then(ok); }
  @Patch("relationships/:id") update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateRelationshipDto) { return this.service.update(user, id, dto).then(ok); }
  @Delete("relationships/:id") remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.remove(user, id).then(ok); }
  @Post("relationships/:id/accept") accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.update(user, id, { status: "ACTIVE" as never }).then(ok); }
  @Post("relationships/:id/reject") reject(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.update(user, id, { status: "REJECTED" as never }).then(ok); }
  @Get("students/:studentId/relationships") forStudent(@CurrentUser() user: AuthenticatedUser, @Param("studentId") id: string) { return this.service.forStudent(user, id).then(ok); }
  @Get("me/students") mine(@CurrentUser() user: AuthenticatedUser) { return this.service.myStudents(user).then(ok); }
  @Get("student/guardian-selection") guardianSelection(@CurrentUser() user: AuthenticatedUser) { return this.service.guardianSelection(user).then(ok); }
  @Get("student/guardian-candidates") guardianCandidates(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) { return this.service.guardianCandidates(user, search).then(ok); }
  @Post("student/guardian-selection") requestGuardian(@CurrentUser() user: AuthenticatedUser, @Body("guardianUserId") guardianUserId: string) { return this.service.requestGuardian(user, guardianUserId).then(ok); }
  @Delete("student/guardian-selection/:id") cancelGuardian(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.cancelGuardianRequest(user, id).then(ok); }
  @Post("students/:studentId/guardian-change-override") @RequireCapabilities("system.manage") allowGuardianChange(@CurrentUser() user: AuthenticatedUser, @Param("studentId") studentId: string) { return this.service.allowGuardianChange(user, studentId).then(ok); }
}
