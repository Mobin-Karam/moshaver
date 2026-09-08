import bcrypt from "bcryptjs";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { MembershipStatus, OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { Organization } from "../../database/entities/organization.entity";
import { Role } from "../../database/entities/role.entity";
import { Student } from "../../database/entities/student.entity";
import { RelationshipStatus, UserRelationship } from "../../database/entities/user-relationship.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { User, UserRole, UserStatus } from "../../database/entities/user.entity";
import { AuthorizationService, UserContext } from "../authorization/authorization.service";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateStudentDto, UpdateStudentDto } from "./dto/student-admin.dto";
import { StudentsService } from "./students.service";
import { CreateLearningItemDto, UpdateLearningItemDto } from "./dto/learning.dto";
import { TaskIssue } from "../../database/entities/task-issue.entity";
import { RecoveryRequest } from "../../database/entities/recovery-request.entity";
import { LearningItem, LearningStatus } from "../../database/entities/learning-item.entity";
import { ExamRetryRequest, RetryRequestStatus } from "../../database/entities/exam-retry-request.entity";
import { UpdateTaskIssueDto } from "./dto/task-issue.dto";

@Injectable()
export class StudentAdministrationService {
  constructor(@InjectRepository(Student) private students:Repository<Student>,@InjectRepository(OrganizationMembership) private memberships:Repository<OrganizationMembership>,@InjectRepository(UserRelationship) private relationships:Repository<UserRelationship>,@InjectRepository(TaskIssue) private issues:Repository<TaskIssue>,@InjectRepository(RecoveryRequest) private recoveries:Repository<RecoveryRequest>,@InjectRepository(LearningItem) private learningItems:Repository<LearningItem>,@InjectRepository(ExamRetryRequest) private retryRequests:Repository<ExamRetryRequest>,private authorization:AuthorizationService,private legacy:StudentsService,private dataSource:DataSource){}
  private context(user:AuthenticatedUser):UserContext{return{...user,roles:user.roles??[user.role],capabilities:user.capabilities??[],membershipIds:user.membershipIds??[],organizationIds:user.organizationIds??[]};}
  async list(user: AuthenticatedUser) {
    const context = this.context(user);
    if (context.roles.includes("PLATFORM_ADMIN")) {
      const rows = await this.students.find({ relations: { user: true }, order: { createdAt: "DESC" } });
      return rows.map((student) => this.project(student));
    }
    if (context.roles.includes("ORGANIZATION_ADMIN")) {
      const members = await this.memberships.find({ where: { organization: { id: In(context.organizationIds) }, status: MembershipStatus.ACTIVE }, relations: { user: true } });
      const userIds = members.map((membership) => membership.user.id);
      if (!userIds.length) return [];
      const rows = await this.students.find({ where: { user: { id: In(userIds) } }, relations: { user: true }, order: { createdAt: "DESC" } });
      return rows.map((student) => this.project(student));
    }
    const links = await this.relationships.find({ where: { fromUser: { id: user.id }, status: RelationshipStatus.ACTIVE }, relations: { toStudent: { user: true } } });
    const ids = links.map((link) => link.toStudent.id);
    if (!ids.length) return [];
    const rows = await this.students.find({ where: { id: In(ids) }, relations: { user: true }, order: { createdAt: "DESC" } });
    return rows.map((student) => this.project(student));
  }
  async get(user:AuthenticatedUser,id:string,capability="students.read"){if(!await this.authorization.canAccessStudent(this.context(user),id,capability))throw new ApiException(404,"NOT_FOUND","دانش‌آموز یافت نشد.");const student=await this.students.findOne({where:{id},relations:{user:true}});if(!student)throw new ApiException(404,"NOT_FOUND","دانش‌آموز یافت نشد.");return this.project(student);}
  async create(actor:AuthenticatedUser,dto:CreateStudentDto){const context=this.context(actor);this.authorization.requireCapability(context,"students.create");if(!context.roles.includes("PLATFORM_ADMIN")&&(!dto.organizationId||!context.organizationIds.includes(dto.organizationId)))throw new ApiException(403,"ORGANIZATION_FORBIDDEN","به این سازمان دسترسی ندارید.");return this.dataSource.transaction(async manager=>{const username=dto.username.trim().toLowerCase();if(await manager.findOne(User,{where:{username}}))throw new ApiException(409,"USERNAME_EXISTS","نام کاربری تکراری است.");const user=await manager.save(User,manager.create(User,{username,passwordHash:await bcrypt.hash(dto.password,12),role:UserRole.STUDENT,status:UserStatus.ACTIVE}));const student=await manager.save(Student,manager.create(Student,{user,name:dto.name,grade:dto.grade??"",major:dto.major??"",targetUniversity:"",targetField:"",targetRank:"",dailyCapacity:"",accountStatus:"active"}));const role=await manager.findOneByOrFail(Role,{code:"STUDENT"});await manager.save(UserRoleAssignment,manager.create(UserRoleAssignment,{user,role,membership:null}));if(dto.organizationId){const organization=await manager.findOne(Organization,{where:{id:dto.organizationId}});if(!organization)throw new ApiException(404,"NOT_FOUND","سازمان یافت نشد.");await manager.save(OrganizationMembership,manager.create(OrganizationMembership,{user,organization,status:MembershipStatus.ACTIVE}));}return this.project(student);});}
  async update(actor:AuthenticatedUser,id:string,dto:UpdateStudentDto){await this.get(actor,id,"students.update");return this.legacy.update(id,dto).then(student=>this.project(student!));}
  async lifecycle(actor:AuthenticatedUser,id:string,action:"activate"|"deactivate"|"restore"|"force-logout"){await this.get(actor,id,"students.update");return this.legacy.lifecycle(id,action);}
  async remove(actor:AuthenticatedUser,id:string){await this.get(actor,id,"students.archive");return this.legacy.remove(id);}
  async resetPassword(actor:AuthenticatedUser,id:string,password:string){await this.get(actor,id,"students.update");return this.legacy.resetPassword(id,password);}
  async learning(actor:AuthenticatedUser,id:string){await this.get(actor,id,"learning.read");return this.legacy.learningForStudent(id);}
  async createLearning(actor:AuthenticatedUser,id:string,dto:CreateLearningItemDto){await this.get(actor,id,"learning.create");return this.legacy.createLearningItem(id,dto);}
  async updateLearning(actor:AuthenticatedUser,id:string,itemId:string,dto:UpdateLearningItemDto){await this.get(actor,id,"learning.update");return this.legacy.updateLearningItem(id,itemId,dto);}
  async deleteLearning(actor:AuthenticatedUser,id:string,itemId:string){await this.get(actor,id,"learning.update");return this.legacy.deleteLearningItem(id,itemId);}
  async learningHistory(actor:AuthenticatedUser,id:string,itemId:string){await this.get(actor,id,"learning.read");return this.legacy.learningReviewHistory(id,itemId);}
  async weekly(actor:AuthenticatedUser,id:string){await this.get(actor,id,"student.progress.read");return this.legacy.weeklyForStudent(id);}
  async topics(actor:AuthenticatedUser,id:string,limit=8){await this.get(actor,id,"student.progress.read");return this.legacy.topicsForStudent(id,limit);}
  async advisorInbox(actor:AuthenticatedUser,id:string){await this.get(actor,id,"students.read");const today=new Date().toISOString().slice(0,10);const [issues,recoveryRequests,reviews,examRetryRequests]=await Promise.all([this.issues.find({where:{student:{id}},relations:{task:true},order:{createdAt:"DESC"},take:50}),this.recoveries.find({where:{student:{id}},order:{createdAt:"DESC"},take:50}),this.learningItems.find({where:{student:{id},status:LearningStatus.PENDING},order:{dueDate:"ASC"},take:50}),this.retryRequests.find({where:{student:{id},status:RetryRequestStatus.PENDING},relations:{exam:true},order:{createdAt:"DESC"},take:50})]);return{issues:issues.map(x=>({...x,status:x.status.toLowerCase(),studentId:id,taskId:x.task?.id,issueType:x.type,note:x.description})),recoveryRequests,reviews:reviews.filter(x=>x.dueDate<=today),missedTasks:[],examRetryRequests:examRetryRequests.map(x=>({...x,examTitle:x.exam?.title}))};}
  async updateTaskIssue(actor:AuthenticatedUser,id:string,dto:UpdateTaskIssueDto){const issue=await this.issues.findOne({where:{id},relations:{student:true}});if(!issue)throw new ApiException(404,"TASK_ISSUE_NOT_FOUND","گزارش مشکل پیدا نشد.");await this.get(actor,issue.student.id,"tasks.update");issue.status=dto.status.toUpperCase();if(dto.advisorNote!==undefined)issue.advisorNote=dto.advisorNote.trim();return this.issues.save(issue);}
  private project(student:Student){return{id:student.id,name:student.name,grade:student.grade,major:student.major,targetUniversity:student.targetUniversity,targetField:student.targetField,targetRank:student.targetRank,dailyCapacity:student.dailyCapacity,accountStatus:student.accountStatus,user:student.user?{id:student.user.id,username:student.user.username,status:student.user.status}:null,createdAt:student.createdAt,updatedAt:student.updatedAt};}
}
