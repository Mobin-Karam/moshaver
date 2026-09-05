import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateStudentDto, ResetStudentPasswordDto, UpdateStudentDto } from "./dto/student-admin.dto";
import { StudentAdministrationService } from "./student-administration.service";
@Controller("students")
export class StudentAdministrationController{constructor(private service:StudentAdministrationService){}
@Get() @RequireCapabilities("students.read") list(@CurrentUser()u:AuthenticatedUser){return this.service.list(u).then(ok)}
@Post() @RequireCapabilities("students.create") create(@CurrentUser()u:AuthenticatedUser,@Body()d:CreateStudentDto){return this.service.create(u,d).then(ok)}
@Get(":id") @RequireCapabilities("students.read") get(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.get(u,id).then(ok)}
@Get(":id/overview") @RequireCapabilities("students.read") overview(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.get(u,id).then(ok)}
@Patch(":id") @RequireCapabilities("students.update") update(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:UpdateStudentDto){return this.service.update(u,id,d).then(ok)}
@Delete(":id") @RequireCapabilities("students.archive") remove(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.remove(u,id).then(ok)}
@Post(":id/activate") @RequireCapabilities("students.update") activate(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.lifecycle(u,id,"activate").then(ok)}
@Post(":id/deactivate") @RequireCapabilities("students.update") deactivate(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.lifecycle(u,id,"deactivate").then(ok)}
@Post(":id/restore") @RequireCapabilities("students.update") restore(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.lifecycle(u,id,"restore").then(ok)}
@Post(":id/force-logout") @RequireCapabilities("students.update") forceLogout(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.lifecycle(u,id,"force-logout").then(ok)}
@Post(":id/reset-password") @RequireCapabilities("students.update") reset(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:ResetStudentPasswordDto){return this.service.resetPassword(u,id,d.password).then(ok)}}
