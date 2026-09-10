import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ok } from "../../common/utils/envelope";
import { UserRole } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { SaveRelaxationTrackDto, SelectRelaxationTrackDto } from "./relaxation.dto";
import { RelaxationService } from "./relaxation.service";

@Controller("system/relaxation-tracks")
@Roles(UserRole.PLATFORM_ADMIN)
export class RelaxationAdminController {
  constructor(private service: RelaxationService) {}
  @Get() list() { return this.service.listManaged().then(ok); }
  @Post() create(@Body() dto: SaveRelaxationTrackDto) { return this.service.create(dto).then(ok); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: SaveRelaxationTrackDto) { return this.service.update(id, dto).then(ok); }
}

@Controller("student/relaxation")
@Roles(UserRole.STUDENT)
export class RelaxationStudentController {
  constructor(private service: RelaxationService) {}
  @Get("today") today(@CurrentUser() user: AuthenticatedUser) { return this.service.today(user.id).then(ok); }
  @Put("today") select(@CurrentUser() user: AuthenticatedUser, @Body() dto: SelectRelaxationTrackDto) { return this.service.select(user.id, dto.trackId).then(ok); }
}
