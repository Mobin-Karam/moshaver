import { Injectable } from "@nestjs/common";
import { buildAuthorizationContext, canAccessOrganization, hasCapability } from "@moshaver/cmb-authorization";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ApiException } from "../../common/exceptions/api.exception";
import {
  OrganizationMembership,
  MembershipStatus,
} from "../../database/entities/organization-membership.entity";
import {
  RelationshipStatus,
  UserRelationship,
} from "../../database/entities/user-relationship.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { Student } from "../../database/entities/student.entity";

export type UserContext = {
  id: string;
  username: string;
  sessionId: string;
  role: string;
  roles: string[];
  capabilities: string[];
  membershipIds: string[];
  organizationIds: string[];
};

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(UserRoleAssignment)
    private readonly assignments: Repository<UserRoleAssignment>,
    @InjectRepository(OrganizationMembership)
    private readonly memberships: Repository<OrganizationMembership>,
    @InjectRepository(UserRelationship)
    private readonly relationships: Repository<UserRelationship>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
  ) {}

  async enrich(base: {
    id: string;
    username: string;
    sessionId: string;
    role: string;
  }, requestedRole?: string, requestedOrganizationId?: string): Promise<UserContext> {
    const [assignments, memberships] = await Promise.all([
      this.assignments.find({
        where: { user: { id: base.id } },
        relations: {
          role: { permissions: { permission: true } },
          membership: { organization: true },
        },
      }),
      this.memberships.find({
        where: { user: { id: base.id }, status: MembershipStatus.ACTIVE },
        relations: { organization: true },
      }),
    ]);
    // A legacy discriminator is never authority. Accounts without an explicit
    // role assignment keep no effective role/capability until provisioned.
    const fallback = base.role === "ADMIN" ? null : base.role;
    const allRoles = [
      ...new Set(
        assignments
          .map((item) => item.role.code)
          .concat(assignments.length || !fallback ? [] : [fallback]),
      ),
    ];
    if (requestedRole && !allRoles.includes(requestedRole))
      throw new ApiException(403, "WORK_CONTEXT_FORBIDDEN", "زمینه کاری انتخاب‌شده در دسترس نیست.");
    if (requestedOrganizationId && !memberships.some((item) => item.organization.id === requestedOrganizationId) && !allRoles.includes("PLATFORM_ADMIN"))
      throw new ApiException(403, "ORGANIZATION_FORBIDDEN", "به این سازمان دسترسی ندارید.");
    return buildAuthorizationContext(
      base,
      assignments.map((item) => ({ role: item.role.code, organizationScoped: item.role.organizationScoped, organizationId: item.membership?.organization?.id, capabilities: item.role.permissions.map((rp) => rp.permission.code) })),
      memberships.map((item) => ({ id: item.id, organizationId: item.organization.id })),
      { requestedRole, requestedOrganizationId },
    );
  }

  hasCapability(context: UserContext, capability: string) {
    return hasCapability(context, capability);
  }
  requireCapability(context: UserContext, capability: string) {
    if (!this.hasCapability(context, capability))
      throw new ApiException(403, "FORBIDDEN", "دسترسی کافی ندارید.");
  }
  canAccessOrganization(
    context: UserContext,
    organizationId: string,
    capability: string,
  ) {
    return canAccessOrganization(context, organizationId, capability);
  }

  async canAccessStudent(
    context: UserContext,
    studentId: string,
    capability: string,
  ) {
    if (!this.hasCapability(context, capability)) return false;
    if (context.roles.includes("PLATFORM_ADMIN")) return true;
    const student = await this.students.findOne({
      where: { id: studentId },
      relations: { user: true },
    });
    if (!student?.user) return false;
    if (student.user.id === context.id) return true;
    if (context.roles.includes("ORGANIZATION_ADMIN")) {
      const sharedMembership = await this.memberships.findOne({
        where: {
          user: { id: student.user.id },
          organization: { id: In(context.organizationIds) },
          status: MembershipStatus.ACTIVE,
        },
      });
      if (sharedMembership) return true;
    }
    const relation = await this.relationships.findOne({
      where: {
        fromUser: { id: context.id },
        toStudent: { id: studentId },
        status: RelationshipStatus.ACTIVE,
      },
    });
    return Boolean(relation);
  }
}
