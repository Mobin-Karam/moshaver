import bcrypt from "bcryptjs";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import { MembershipStatus, OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { Organization } from "../../database/entities/organization.entity";
import { Role } from "../../database/entities/role.entity";
import { Session } from "../../database/entities/session.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { User, UserRole, UserStatus } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateUserDto, SetRolesDto, UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private users: Repository<User>, @InjectRepository(UserRoleAssignment) private assignments: Repository<UserRoleAssignment>, @InjectRepository(Session) private sessions: Repository<Session>, private dataSource: DataSource) {}
  private platform(actor: AuthenticatedUser) { return actor.roles?.includes("PLATFORM_ADMIN"); }
  private assertOrg(actor: AuthenticatedUser, organizationId?: string) { if (!this.platform(actor) && (!organizationId || !actor.organizationIds?.includes(organizationId))) throw new ApiException(403,"ORGANIZATION_FORBIDDEN","به این سازمان دسترسی ندارید."); }
  private assertRoles(actor: AuthenticatedUser, roles: string[]) { if (!this.platform(actor) && roles.includes("PLATFORM_ADMIN")) throw new ApiException(403,"ROLE_ESCALATION","تخصیص مدیر پلتفرم مجاز نیست."); }
  async list(actor: AuthenticatedUser, organizationId?: string, roleCode?: string, status?: UserStatus) {
    const scopedOrganizationId = organizationId ?? (!this.platform(actor) ? actor.organizationIds?.[0] : undefined);
    if (scopedOrganizationId) this.assertOrg(actor, scopedOrganizationId);
    const rows = await this.assignments.find({
      where: { ...(roleCode ? { role: { code: roleCode } } : {}), ...(scopedOrganizationId ? { membership: { organization: { id: scopedOrganizationId }, status: MembershipStatus.ACTIVE } } : {}) },
      relations: { user: true, role: { permissions: { permission: true } }, membership: { organization: true } },
    });
    const users = [...new Map(rows.filter((row) => !status || row.user.status === status).map((row) => [row.user.id, row.user])).values()];
    return users.map((user) => this.project(user, rows.filter((row) => row.user.id === user.id)));
  }
  async get(actor: AuthenticatedUser, id: string) { const rows = await this.assignments.find({ where: { user: { id } }, relations: { user: true, role: { permissions: { permission: true } }, membership: { organization: true } } }); if (!rows.length) throw new ApiException(404,"NOT_FOUND","کاربر یافت نشد."); if (!this.platform(actor) && !rows.some((row) => row.membership && actor.organizationIds?.includes(row.membership.organization.id))) throw new ApiException(404,"NOT_FOUND","کاربر یافت نشد."); return this.project(rows[0].user, rows); }
  async create(actor: AuthenticatedUser, dto: CreateUserDto) { this.assertRoles(actor,dto.roleCodes); if (dto.organizationId) this.assertOrg(actor,dto.organizationId); if (!this.platform(actor) && !dto.organizationId) throw new ApiException(400,"ORGANIZATION_REQUIRED","سازمان الزامی است."); return this.dataSource.transaction(async (manager) => { if (await manager.findOne(User,{where:{username:dto.username.trim().toLowerCase()}})) throw new ApiException(409,"USERNAME_EXISTS","نام کاربری تکراری است."); const user = await manager.save(User,manager.create(User,{username:dto.username.trim().toLowerCase(),passwordHash:await bcrypt.hash(dto.password,12),firstName:dto.firstName??"",lastName:dto.lastName??"",status:UserStatus.ACTIVE,role:(dto.roleCodes.includes("STUDENT")?UserRole.STUDENT:UserRole.ADMIN)})); let membership: OrganizationMembership|null=null; if(dto.organizationId){const org=await manager.findOne(Organization,{where:{id:dto.organizationId}});if(!org)throw new ApiException(404,"NOT_FOUND","سازمان یافت نشد.");membership=await manager.save(OrganizationMembership,manager.create(OrganizationMembership,{user,organization:org,status:MembershipStatus.ACTIVE}));} const roles=await manager.find(Role,{where:{code:In(dto.roleCodes)}}); if(roles.length!==new Set(dto.roleCodes).size)throw new ApiException(400,"INVALID_ROLE","نقش نامعتبر است."); for(const role of roles){if(role.organizationScoped&&!membership)throw new ApiException(400,"ORGANIZATION_REQUIRED","نقش سازمانی به عضویت نیاز دارد.");await manager.save(UserRoleAssignment,manager.create(UserRoleAssignment,{user,role,membership:role.organizationScoped?membership:null}));} return {id:user.id,username:user.username,roles:roles.map((role)=>role.code)}; }); }
  async update(actor: AuthenticatedUser,id:string,dto:UpdateUserDto){await this.get(actor,id);await this.users.update(id,dto);return this.get(actor,id);}
  async setActive(actor:AuthenticatedUser,id:string,active:boolean){await this.get(actor,id);await this.users.update(id,{status:active?UserStatus.ACTIVE:UserStatus.DISABLED});if(!active)await this.sessions.delete({user:{id}});return{userId:id,status:active?UserStatus.ACTIVE:UserStatus.DISABLED};}
  async setRoles(actor:AuthenticatedUser,id:string,dto:SetRolesDto){this.assertRoles(actor,dto.roleCodes);if(dto.organizationId)this.assertOrg(actor,dto.organizationId);await this.get(actor,id);return this.dataSource.transaction(async(manager)=>{const user=await manager.findOneByOrFail(User,{id});const roles=await manager.find(Role,{where:{code:In(dto.roleCodes)}});if(roles.length!==new Set(dto.roleCodes).size)throw new ApiException(400,"INVALID_ROLE","نقش نامعتبر است.");let membership:OrganizationMembership|null=null;if(dto.organizationId)membership=await manager.findOne(OrganizationMembership,{where:{user:{id},organization:{id:dto.organizationId},status:MembershipStatus.ACTIVE}});if(dto.organizationId&&!membership)throw new ApiException(400,"MEMBERSHIP_REQUIRED","عضویت فعال یافت نشد.");for(const role of roles){if(role.organizationScoped&&!membership)throw new ApiException(400,"ORGANIZATION_REQUIRED","نقش سازمانی به عضویت نیاز دارد.");const exists=await manager.findOne(UserRoleAssignment,{where:{user:{id},role:{id:role.id},membership:role.organizationScoped?{id:membership!.id}:undefined}});if(!exists)await manager.save(UserRoleAssignment,manager.create(UserRoleAssignment,{user,role,membership:role.organizationScoped?membership:null}));}return{userId:id,roles:roles.map((role)=>role.code),organizationId:dto.organizationId??null};});}
  async capabilities(actor:AuthenticatedUser,id:string){const user=await this.get(actor,id);return{userId:id,capabilities:[...new Set(user.assignments.flatMap((item:{capabilities:string[]})=>item.capabilities))]};}
  private project(user:User,rows:UserRoleAssignment[]){return{id:user.id,username:user.username,firstName:user.firstName,lastName:user.lastName,status:user.status,assignments:rows.map((row)=>({role:row.role.code,organizationId:row.membership?.organization.id??null,capabilities:row.role.permissions?.map((rp)=>rp.permission.code)??[]}))};}
}
