import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { AddMemberDto, CreateOrganizationDto, UpdateMemberDto, UpdateOrganizationDto } from "./dto/organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}
  @Get() @RequireCapabilities("organization.read") list(@CurrentUser() user: AuthenticatedUser) { return this.service.list(user).then(ok); }
  @Get(":id") @RequireCapabilities("organization.read") get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.get(user, id).then(ok); }
  @Post() @RequireCapabilities("organization.manage") create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrganizationDto) { return this.service.create(user, dto).then(ok); }
  @Patch(":id") @RequireCapabilities("organization.manage") update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateOrganizationDto) { return this.service.update(user, id, dto).then(ok); }
  @Get(":id/members") @RequireCapabilities("organization.members.manage") members(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.listMembers(user, id).then(ok); }
  @Post(":id/members") @RequireCapabilities("organization.members.manage") add(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddMemberDto) { return this.service.addMember(user, id, dto).then(ok); }
  @Patch(":id/members/:userId") @RequireCapabilities("organization.members.manage") updateMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string, @Body() dto: UpdateMemberDto) { return this.service.updateMember(user, id, userId, dto).then(ok); }
  @Delete(":id/members/:userId") @RequireCapabilities("organization.members.manage") remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string) { return this.service.removeMember(user, id, userId).then(ok); }
}
