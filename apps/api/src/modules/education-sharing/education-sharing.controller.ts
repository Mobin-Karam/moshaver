import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth";
import { ShareEducationDto } from "./education-sharing.dto";
import { EducationSharingService } from "./education-sharing.service";

@Controller("education-sharing")
export class EducationSharingController {
  constructor(private readonly sharing: EducationSharingService) {}
  @Get("peers") @RequireCapabilities("education.share") peers(@CurrentUser() user: AuthenticatedUser) { return this.sharing.peers(user).then(ok); }
  @Post("plans/:id") @RequireCapabilities("education.share") sharePlan(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ShareEducationDto) { return this.sharing.sharePlan(user, id, dto.targetStudentId, dto.date).then(ok); }
  @Post("learning-resources/:id") @RequireCapabilities("education.share") shareResource(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ShareEducationDto) { return this.sharing.shareResource(user, id, dto.targetStudentId).then(ok); }
}
