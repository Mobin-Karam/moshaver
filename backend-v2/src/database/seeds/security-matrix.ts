import "reflect-metadata";
import bcrypt from "bcryptjs";
import dataSource from "../data-source";
import { Organization, OrganizationStatus, OrganizationType } from "../entities/organization.entity";
import { MembershipStatus, OrganizationMembership } from "../entities/organization-membership.entity";
import { Role } from "../entities/role.entity";
import { Student } from "../entities/student.entity";
import { RelationshipStatus, RelationshipType, UserRelationship } from "../entities/user-relationship.entity";
import { UserRoleAssignment } from "../entities/user-role-assignment.entity";
import { User, UserRole, UserStatus } from "../entities/user.entity";

const password = process.env.E2E_PASSWORD || "Moshaver-e2e-2026!";

async function main() {
  if (process.env.ALLOW_E2E_SEED !== "true" || process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create test identities. Use ALLOW_E2E_SEED=true against a disposable non-production database.");
  }
  await dataSource.initialize();
  const manager = dataSource.manager;
  const hash = await bcrypt.hash(password, 12);
  const orgA = await ensureOrganization("E2E Organization A");
  const orgB = await ensureOrganization("E2E Organization B");

  const studentAUser = await ensureUser("e2e.student.a", UserRole.STUDENT, hash);
  const studentBUser = await ensureUser("e2e.student.b", UserRole.STUDENT, hash);
  const studentA = await ensureStudent(studentAUser, "Student A");
  const studentB = await ensureStudent(studentBUser, "Student B");
  await ensureMembershipAndRole(studentAUser, orgA, "STUDENT", false);
  await ensureMembershipAndRole(studentBUser, orgB, "STUDENT", false);

  const identities: Array<[string, UserRole, Organization, string, Student | null, RelationshipType | null]> = [
    ["e2e.guardian.a", UserRole.GUARDIAN, orgA, "GUARDIAN", studentA, RelationshipType.GUARDIAN_OF],
    ["e2e.guardian.b", UserRole.GUARDIAN, orgB, "GUARDIAN", studentB, RelationshipType.GUARDIAN_OF],
    ["e2e.advisor.a", UserRole.ADVISOR, orgA, "ADVISOR", studentA, RelationshipType.ADVISOR_OF],
    ["e2e.advisor.b", UserRole.ADVISOR, orgB, "ADVISOR", studentB, RelationshipType.ADVISOR_OF],
    ["e2e.teacher.a", UserRole.TEACHER, orgA, "TEACHER", studentA, RelationshipType.TEACHER_OF],
    ["e2e.teacher.b", UserRole.TEACHER, orgB, "TEACHER", studentB, RelationshipType.TEACHER_OF],
    ["e2e.mentor.a", UserRole.MENTOR, orgA, "MENTOR", studentA, RelationshipType.MENTOR_OF],
    ["e2e.content.a", UserRole.CONTENT_MANAGER, orgA, "CONTENT_MANAGER", null, null],
    ["e2e.orgadmin.a", UserRole.ORGANIZATION_ADMIN, orgA, "ORGANIZATION_ADMIN", null, null],
    ["e2e.orgadmin.b", UserRole.ORGANIZATION_ADMIN, orgB, "ORGANIZATION_ADMIN", null, null],
  ];
  for (const [username, discriminator, organization, role, student, relationship] of identities) {
    const user = await ensureUser(username, discriminator, hash);
    await ensureMembershipAndRole(user, organization, role, true);
    if (student && relationship) await ensureRelationship(user, student, organization, relationship);
  }
  const platform = await ensureUser("e2e.platform", UserRole.PLATFORM_ADMIN, hash);
  await ensureRole(platform, "PLATFORM_ADMIN", null);
  const multi = await ensureUser("e2e.multi", UserRole.ADVISOR, hash);
  await ensureMembershipAndRole(multi, orgA, "ADVISOR", true);
  await ensureMembershipAndRole(multi, orgA, "TEACHER", true);
  await ensureRelationship(multi, studentA, orgA, RelationshipType.ADVISOR_OF);

  console.log(JSON.stringify({ database: process.env.DATABASE_PATH, password, users: ["e2e.student.a", "e2e.student.b", ...identities.map(([name]) => name), "e2e.platform", "e2e.multi"] }, null, 2));
  await dataSource.destroy();

  async function ensureOrganization(name: string) {
    const repo = manager.getRepository(Organization);
    return (await repo.findOne({ where: { name } })) ?? repo.save(repo.create({ name, type: OrganizationType.SCHOOL, status: OrganizationStatus.ACTIVE }));
  }
  async function ensureUser(username: string, role: UserRole, passwordHash: string) {
    const repo = manager.getRepository(User);
    const found = await repo.findOne({ where: { username } });
    if (found) { found.passwordHash = passwordHash; found.status = UserStatus.ACTIVE; return repo.save(found); }
    return repo.save(repo.create({ username, passwordHash, role, status: UserStatus.ACTIVE, firstName: username, lastName: "" }));
  }
  async function ensureStudent(user: User, name: string) {
    const repo = manager.getRepository(Student);
    return (await repo.findOne({ where: { user: { id: user.id } }, relations: { user: true } })) ?? repo.save(repo.create({ user, name, grade: "", major: "", targetUniversity: "", targetField: "", targetRank: "", dailyCapacity: "", accountStatus: "active" }));
  }
  async function ensureMembershipAndRole(user: User, organization: Organization, role: string, scoped: boolean) {
    const repo = manager.getRepository(OrganizationMembership);
    let membership = await repo.findOne({ where: { user: { id: user.id }, organization: { id: organization.id } }, relations: { user: true, organization: true } });
    if (!membership) membership = await repo.save(repo.create({ user, organization, status: MembershipStatus.ACTIVE }));
    await ensureRole(user, role, scoped ? membership : null);
  }
  async function ensureRole(user: User, code: string, membership: OrganizationMembership | null) {
    const role = await manager.getRepository(Role).findOneByOrFail({ code });
    const repo = manager.getRepository(UserRoleAssignment);
    const found = await repo.findOne({ where: { user: { id: user.id }, role: { id: role.id }, ...(membership ? { membership: { id: membership.id } } : {}) } });
    if (!found) await repo.save(repo.create({ user, role, membership }));
  }
  async function ensureRelationship(fromUser: User, toStudent: Student, organization: Organization, type: RelationshipType) {
    const repo = manager.getRepository(UserRelationship);
    const found = await repo.findOne({ where: { fromUser: { id: fromUser.id }, toStudent: { id: toStudent.id }, organization: { id: organization.id }, type } });
    if (!found) await repo.save(repo.create({ fromUser, toStudent, organization, type, status: RelationshipStatus.ACTIVE, acceptedAt: new Date() }));
  }
}

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
