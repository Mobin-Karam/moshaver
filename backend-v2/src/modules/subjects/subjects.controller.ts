import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import {
  AssignTeacherSubjectDto,
  CreateSubjectDto,
  UpdateStudentSubjectDto,
  UpdateSubjectDto,
} from "./subject.dto";
import { SubjectsService } from "./subjects.service";
@Controller()
export class SubjectsController {
  constructor(private service: SubjectsService) {}
  @Get("subjects") @RequireCapabilities("subjects.read") list(
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.service.list(u).then(ok);
  }
  @Post("subjects") @RequireCapabilities("subjects.create") create(
    @CurrentUser() u: AuthenticatedUser,
    @Body() d: CreateSubjectDto,
  ) {
    return this.service.create(u, d).then(ok);
  }
  @Patch("subjects/:id") @RequireCapabilities("subjects.update") update(
    @CurrentUser() u: AuthenticatedUser,
    @Param("id") id: string,
    @Body() d: UpdateSubjectDto,
  ) {
    return this.service.update(u, id, d).then(ok);
  }
  @Post("subjects/:id/teachers")
  @RequireCapabilities("organization.members.manage")
  assignTeacher(
    @CurrentUser() u: AuthenticatedUser,
    @Param("id") id: string,
    @Body() d: AssignTeacherSubjectDto,
  ) {
    return this.service.assignTeacher(u, id, d).then(ok);
  }
  @Delete("subjects/:id/teachers/:teacherId")
  @RequireCapabilities("organization.members.manage")
  unassignTeacher(
    @CurrentUser() u: AuthenticatedUser,
    @Param("id") id: string,
    @Param("teacherId") teacherId: string,
    @Query("organizationId") organizationId: string,
  ) {
    return this.service
      .unassignTeacher(u, id, teacherId, organizationId)
      .then(ok);
  }
  @Get("students/:studentId/subjects")
  @RequireCapabilities("studentSubjects.read")
  forStudent(
    @CurrentUser() u: AuthenticatedUser,
    @Param("studentId") id: string,
  ) {
    return this.service.forStudent(u, id).then(ok);
  }
  @Patch("students/:studentId/subjects/:subjectId")
  @RequireCapabilities("studentSubjects.manage")
  configure(
    @CurrentUser() u: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Param("subjectId") subjectId: string,
    @Body() d: UpdateStudentSubjectDto,
  ) {
    return this.service.configure(u, studentId, subjectId, d).then(ok);
  }
}
