import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateStudentDto, ResetStudentPasswordDto, UpdateStudentDto } from "./dto/student-admin.dto";
import { StudentAdministrationService } from "./student-administration.service";
import { CreateLearningItemDto, UpdateLearningItemDto } from "./dto/learning.dto";
import { UpdateTaskIssueDto } from "./dto/task-issue.dto";
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
@Post(":id/reset-password") @RequireCapabilities("students.update") reset(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:ResetStudentPasswordDto){return this.service.resetPassword(u,id,d.password).then(ok)}
@Get(":id/learning") @RequireCapabilities("learning.read") learning(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.learning(u,id).then(ok)}
@Post(":id/learning") @RequireCapabilities("learning.create") createLearning(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:CreateLearningItemDto){return this.service.createLearning(u,id,d).then(ok)}
@Patch(":id/learning/:itemId") @RequireCapabilities("learning.update") updateLearning(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("itemId")itemId:string,@Body()d:UpdateLearningItemDto){return this.service.updateLearning(u,id,itemId,d).then(ok)}
@Delete(":id/learning/:itemId") @RequireCapabilities("learning.update") deleteLearning(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("itemId")itemId:string){return this.service.deleteLearning(u,id,itemId).then(ok)}
@Get(":id/learning/:itemId/reviews") @RequireCapabilities("learning.read") history(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Param("itemId")itemId:string){return this.service.learningHistory(u,id,itemId).then(ok)}
@Get(":id/progress/weekly") @RequireCapabilities("student.progress.read") weekly(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.weekly(u,id).then(ok)}
@Get(":id/performance/topics") @RequireCapabilities("student.progress.read") topics(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.topics(u,id).then(ok)}
@Get(":id/advisor-inbox") @RequireCapabilities("students.read") inbox(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.advisorInbox(u,id).then(ok)}
@Patch("task-issues/:issueId") @RequireCapabilities("tasks.update") updateIssue(@CurrentUser()u:AuthenticatedUser,@Param("issueId")id:string,@Body()d:UpdateTaskIssueDto){return this.service.updateTaskIssue(u,id,d).then(ok)}
}
