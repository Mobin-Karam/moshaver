import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { UserStatus } from "../../database/entities/user.entity";
import { AuthenticatedUser } from "../auth/auth.service";
import { CreateUserDto, SetRolesDto, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";
@Controller("users") @RequireCapabilities("users.read")
export class UsersController { constructor(private service:UsersService){}
@Get() list(@CurrentUser()u:AuthenticatedUser,@Query("organizationId")o?:string,@Query("role")r?:string,@Query("status")s?:UserStatus){return this.service.list(u,o,r,s).then(ok)}
@Post() @RequireCapabilities("users.manage") create(@CurrentUser()u:AuthenticatedUser,@Body()d:CreateUserDto){return this.service.create(u,d).then(ok)}
@Get(":id") get(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.get(u,id).then(ok)}
@Patch(":id") @RequireCapabilities("users.manage") update(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:UpdateUserDto){return this.service.update(u,id,d).then(ok)}
@Post(":id/activate") @RequireCapabilities("users.manage") activate(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.setActive(u,id,true).then(ok)}
@Post(":id/deactivate") @RequireCapabilities("users.manage") deactivate(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.setActive(u,id,false).then(ok)}
@Get(":id/roles") roles(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.get(u,id).then((x)=>ok(x.assignments))}
@Put(":id/roles") @RequireCapabilities("users.manage") setRoles(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string,@Body()d:SetRolesDto){return this.service.setRoles(u,id,d).then(ok)}
@Get(":id/capabilities") capabilities(@CurrentUser()u:AuthenticatedUser,@Param("id")id:string){return this.service.capabilities(u,id).then(ok)} }
