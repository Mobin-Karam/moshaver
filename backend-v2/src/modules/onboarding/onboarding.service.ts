import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import bcrypt from "bcryptjs";
import { ApiException } from "../../common/exceptions/api.exception";
import { MembershipStatus, OrganizationMembership } from "../../database/entities/organization-membership.entity";
import { Organization, OrganizationStatus } from "../../database/entities/organization.entity";
import { Role } from "../../database/entities/role.entity";
import { Student } from "../../database/entities/student.entity";
import { UserRoleAssignment } from "../../database/entities/user-role-assignment.entity";
import { RelationshipStatus, RelationshipType, UserRelationship } from "../../database/entities/user-relationship.entity";
import { User, UserRole, UserStatus } from "../../database/entities/user.entity";
import { Conversation } from "../../database/entities/conversation.entity";
import { ConversationMember } from "../../database/entities/conversation-member.entity";
import { ConversationType } from "../../database/entities/conversation.entity";
import { AssignStudentOnboardingDto, StudentSignupDto } from "./onboarding.dto";

@Injectable()
export class OnboardingService {
  constructor(private dataSource: DataSource) {}

  async signup(dto: StudentSignupDto) {
    return this.dataSource.transaction(async (manager) => {
      const username = dto.username.trim().toLowerCase();
      if (await manager.findOne(User, { where: { username } })) throw new ApiException(409, "USERNAME_EXISTS", "این نام کاربری قبلاً استفاده شده است.");
      const user = await manager.save(User, manager.create(User, { username, passwordHash: await bcrypt.hash(dto.password, 12), role: UserRole.STUDENT, status: UserStatus.ACTIVE }));
      const student = await manager.save(Student, manager.create(Student, { user, name: dto.name.trim(), grade: dto.grade.trim(), major: dto.major.trim(), targetUniversity: "", targetField: "", targetRank: "", dailyCapacity: "", accountStatus: "active", onboardingStatus: "PENDING_ASSIGNMENT" }));
      const role = await manager.findOneByOrFail(Role, { code: "STUDENT" });
      await manager.save(UserRoleAssignment, manager.create(UserRoleAssignment, { user, role, membership: null }));
      return { id: student.id, username, onboardingStatus: student.onboardingStatus };
    });
  }

  async pending() {
    const rows = await this.dataSource.getRepository(Student).find({ where: { onboardingStatus: "PENDING_ASSIGNMENT" }, relations: { user: true }, order: { createdAt: "ASC" } });
    return rows.map((student) => ({ id: student.id, name: student.name, grade: student.grade, major: student.major, username: student.user?.username, createdAt: student.createdAt }));
  }

  async assign(studentId: string, dto: AssignStudentOnboardingDto) {
    return this.dataSource.transaction(async (manager) => {
      const choice = dto.mode === "AUTO" ? await this.automaticAssignment(manager) : { organizationId: dto.organizationId, advisorUserId: dto.advisorUserId };
      const [student, organization, advisor, advisorRole, advisorMembership] = await Promise.all([
        manager.findOne(Student, { where: { id: studentId }, relations: { user: true } }),
        manager.findOne(Organization, { where: { id: choice.organizationId, status: OrganizationStatus.ACTIVE } }),
        manager.findOne(User, { where: { id: choice.advisorUserId, status: UserStatus.ACTIVE } }),
        manager.findOne(UserRoleAssignment, { where: { user: { id: choice.advisorUserId }, role: { code: "ADVISOR" }, membership: { organization: { id: choice.organizationId }, status: MembershipStatus.ACTIVE } }, relations: { role: true, user: true, membership: { organization: true } } }),
        manager.findOne(OrganizationMembership, { where: { user: { id: choice.advisorUserId }, organization: { id: choice.organizationId }, status: MembershipStatus.ACTIVE } }),
      ]);
      if (!student?.user || !organization) throw new ApiException(404, "NOT_FOUND", "دانش‌آموز یا سازمان پیدا نشد.");
      const studentUser = student.user;
      if (!advisor || !advisorRole || !advisorMembership) throw new ApiException(400, "INVALID_ADVISOR", "مشاور باید عضو فعال سازمان انتخاب‌شده باشد.");
      let membership = await manager.findOne(OrganizationMembership, { where: { organization: { id: organization.id }, user: { id: studentUser.id } } });
      membership = await manager.save(OrganizationMembership, membership ? Object.assign(membership, { status: MembershipStatus.ACTIVE }) : manager.create(OrganizationMembership, { organization, user: studentUser, status: MembershipStatus.ACTIVE }));
      let relationship = await manager.findOne(UserRelationship, { where: { fromUser: { id: advisor.id }, toStudent: { id: student.id }, organization: { id: organization.id }, type: RelationshipType.ADVISOR_OF } });
      relationship = await manager.save(UserRelationship, relationship ? Object.assign(relationship, { status: RelationshipStatus.ACTIVE, acceptedAt: new Date(), revokedAt: null }) : manager.create(UserRelationship, { fromUser: advisor, toStudent: student, organization, type: RelationshipType.ADVISOR_OF, status: RelationshipStatus.ACTIVE, acceptedAt: new Date() }));
      const advisorConversations = await manager.find(ConversationMember, { where: { user: { id: advisor.id } }, relations: { conversation: { members: { user: true } } } });
      let conversation = advisorConversations.find((item) => item.conversation.type === ConversationType.DIRECT && !item.leftAt && item.conversation.members.some((member) => member.user.id === studentUser.id && !member.leftAt))?.conversation;
      if (!conversation) {
        conversation = await manager.save(Conversation, manager.create(Conversation, { type: ConversationType.DIRECT, title: "", owner: advisor }));
        await manager.save(ConversationMember, [manager.create(ConversationMember, { conversation, user: advisor }), manager.create(ConversationMember, { conversation, user: studentUser })]);
      }
      student.onboardingStatus = "ASSIGNED";
      await manager.save(Student, student);
      return { studentId: student.id, organization: { id: organization.id, name: organization.name }, advisor: { id: advisor.id, username: advisor.username, firstName: advisor.firstName, lastName: advisor.lastName }, membershipId: membership.id, relationshipId: relationship.id, conversationId: conversation.id, onboardingStatus: student.onboardingStatus };
    });
  }

  private async automaticAssignment(manager: EntityManager) {
    const assignments = await manager.find(UserRoleAssignment, {
      where: { role: { code: "ADVISOR" }, membership: { status: MembershipStatus.ACTIVE, organization: { status: OrganizationStatus.ACTIVE } }, user: { status: UserStatus.ACTIVE } },
      relations: { role: true, user: true, membership: { organization: true } },
    });
    if (!assignments.length) throw new ApiException(409, "NO_ELIGIBLE_ADVISOR", "هیچ مشاور فعالی در سازمان‌های فعال وجود ندارد. ابتدا یک مشاور به سازمان اضافه کنید.");
    const activeRelationships = await manager.find(UserRelationship, { where: { type: RelationshipType.ADVISOR_OF, status: RelationshipStatus.ACTIVE }, relations: { fromUser: true, organization: true } });
    const load = new Map<string, number>();
    for (const relationship of activeRelationships) load.set(`${relationship.organization?.id}:${relationship.fromUser.id}`, (load.get(`${relationship.organization?.id}:${relationship.fromUser.id}`) || 0) + 1);
    const selected = [...assignments].sort((left, right) => {
      const leftKey = `${left.membership?.organization.id}:${left.user.id}`;
      const rightKey = `${right.membership?.organization.id}:${right.user.id}`;
      return (load.get(leftKey) || 0) - (load.get(rightKey) || 0) || left.membership!.organization.name.localeCompare(right.membership!.organization.name, "fa") || left.user.username.localeCompare(right.user.username);
    })[0];
    return { organizationId: selected.membership!.organization.id, advisorUserId: selected.user.id };
  }
}
