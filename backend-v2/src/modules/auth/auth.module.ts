import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Session } from "../../database/entities/session.entity";
import { User } from "../../database/entities/user.entity";
import { Student } from "../../database/entities/student.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { MeController } from "./me.controller";
import { LoginThrottle } from "../../database/entities/login-throttle.entity";
import { LoginThrottleService } from "./login-throttle.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, Student, UserRoleAssignment, OrganizationMembership, LoginThrottle])],
  controllers: [AuthController, MeController],
  providers: [AuthService, LoginThrottleService],
  exports: [AuthService],
})
export class AuthModule {}
