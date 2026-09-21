import "reflect-metadata";
import bcrypt from "bcryptjs";
import { EntityManager } from "typeorm";
import dataSource from "../data-source";
import { MembershipStatus, OrganizationMembership } from "../entities/organization-membership.entity";
import { Organization, OrganizationStatus, OrganizationType } from "../entities/organization.entity";
import { Role } from "../entities/role.entity";
import { Student } from "../entities/student.entity";
import { RelationshipStatus, RelationshipType, UserRelationship } from "../entities/user-relationship.entity";
import { UserRoleAssignment } from "../entities/user-role-assignment.entity";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { seedEducationCatalog } from "../../modules/education-catalog/education-catalog.service";
import { isValidIranianNationalCode, normalizeNationalCode } from "../../modules/onboarding/national-code";

const DEVELOPMENT_PASSWORD = "Moshaver-development-2026!";
const DEVELOPMENT_NATIONAL_CODE = "1000000001";

export type PrivateOrganizationSeedConfig = {
  production: boolean;
  organizationName: string;
  advisorPassword: string;
  studentPassword: string;
  studentNationalCode: string;
};

export function resolvePrivateOrganizationSeedConfig(
  env: NodeJS.ProcessEnv = process.env,
): PrivateOrganizationSeedConfig {
  const production = env.NODE_ENV === "production";
  if (production && env.ALLOW_PRODUCTION_BOOTSTRAP !== "true") {
    throw new Error(
      "Refusing production bootstrap: set ALLOW_PRODUCTION_BOOTSTRAP=true for this one-time operation.",
    );
  }

  const advisorPassword = env.MOBINKARAM_PASSWORD || (production ? "" : DEVELOPMENT_PASSWORD);
  const studentPassword = env.MAHAKARAM_PASSWORD || (production ? "" : DEVELOPMENT_PASSWORD);
  if (advisorPassword.length < 12 || studentPassword.length < 12) {
    throw new Error("Bootstrap passwords must be provided and contain at least 12 characters.");
  }
  if (production && advisorPassword === studentPassword) {
    throw new Error("Production bootstrap accounts must use different passwords.");
  }

  const studentNationalCode = normalizeNationalCode(
    env.MAHAKARAM_NATIONAL_CODE || (production ? "" : DEVELOPMENT_NATIONAL_CODE),
  );
  if (!isValidIranianNationalCode(studentNationalCode)) {
    throw new Error("MAHAKARAM_NATIONAL_CODE must be a valid Iranian national code.");
  }

  return {
    production,
    organizationName: env.PRIVATE_ORGANIZATION_NAME?.trim() || "سازمان خصوصی مه‌کارام",
    advisorPassword,
    studentPassword,
    studentNationalCode,
  };
}

export async function seedPrivateOrganization(
  config = resolvePrivateOrganizationSeedConfig(),
) {
  await dataSource.initialize();
  await dataSource.runMigrations();
  try {
    const summary = await dataSource.transaction((manager) => seed(manager, config));
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await dataSource.destroy();
  }
}

async function seed(manager: EntityManager, config: PrivateOrganizationSeedConfig) {
  const organizations = manager.getRepository(Organization);
  let organization = await organizations.findOne({ where: { name: config.organizationName } });
  if (!organization) organization = organizations.create({ name: config.organizationName });
  organization.type = OrganizationType.PRIVATE_PRACTICE;
  organization.status = OrganizationStatus.ACTIVE;
  organization = await organizations.save(organization);

  const advisor = await upsertUser(
    manager,
    "mobinkaram",
    "مبین",
    "کرام",
    UserRole.ADVISOR,
    config.advisorPassword,
  );
  const studentUser = await upsertUser(
    manager,
    "mahakaram",
    "مها",
    "کرام",
    UserRole.STUDENT,
    config.studentPassword,
  );
  const advisorMembership = await ensureMembership(manager, advisor, organization);
  const studentMembership = await ensureMembership(manager, studentUser, organization);
  await ensureRole(manager, advisor, "ADVISOR", advisorMembership);
  await ensureRole(manager, studentUser, "STUDENT", studentMembership);

  const students = manager.getRepository(Student);
  let student = await students.findOne({
    where: { user: { id: studentUser.id } },
    relations: { user: true },
  });
  if (!student) student = students.create({ user: studentUser, name: "مها کرام" });
  Object.assign(student, {
    user: studentUser,
    name: "مها کرام",
    nationalCode: config.studentNationalCode,
    gradeId: 12,
    grade: "پایه دوازدهم",
    educationTypeId: "theoretical",
    trackId: "experimental_sciences",
    major: "علوم تجربی",
    accountStatus: "active",
    onboardingStatus: "ASSIGNED",
  } satisfies Partial<Student>);
  student = await students.save(student);

  const relationships = manager.getRepository(UserRelationship);
  let relationship = await relationships.findOne({
    where: {
      fromUser: { id: advisor.id },
      toStudent: { id: student.id },
      organization: { id: organization.id },
      type: RelationshipType.ADVISOR_OF,
    },
  });
  if (!relationship) {
    relationship = relationships.create({
      fromUser: advisor,
      toStudent: student,
      organization,
      type: RelationshipType.ADVISOR_OF,
    });
  }
  relationship.status = RelationshipStatus.ACTIVE;
  relationship.acceptedAt ??= new Date();
  relationship.revokedAt = null;
  await relationships.save(relationship);

  const textbooks = await seedEducationCatalog(manager);
  return {
    mode: config.production ? "production" : "development",
    organization: { id: organization.id, name: organization.name, type: organization.type },
    users: [
      { username: advisor.username, role: "ADVISOR" },
      { username: studentUser.username, role: "STUDENT" },
    ],
    student: { id: student.id, gradeId: student.gradeId, trackId: student.trackId },
    textbooks,
  };
}

async function upsertUser(
  manager: EntityManager,
  username: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  password: string,
) {
  const users = manager.getRepository(User);
  let user = await users.findOne({ where: { username } });
  if (!user) user = users.create({ username });
  Object.assign(user, {
    username,
    firstName,
    lastName,
    role,
    status: UserStatus.ACTIVE,
    passwordHash: await bcrypt.hash(password, 12),
    locale: "fa-IR",
    timezone: "Asia/Tehran",
  } satisfies Partial<User>);
  return users.save(user);
}

async function ensureMembership(manager: EntityManager, user: User, organization: Organization) {
  const memberships = manager.getRepository(OrganizationMembership);
  let membership = await memberships.findOne({
    where: { user: { id: user.id }, organization: { id: organization.id } },
  });
  if (!membership) membership = memberships.create({ user, organization });
  membership.status = MembershipStatus.ACTIVE;
  return memberships.save(membership);
}

async function ensureRole(
  manager: EntityManager,
  user: User,
  code: "ADVISOR" | "STUDENT",
  membership: OrganizationMembership,
) {
  const role = await manager.getRepository(Role).findOneByOrFail({ code });
  const assignments = manager.getRepository(UserRoleAssignment);
  const existing = await assignments.findOne({
    where: {
      user: { id: user.id },
      role: { id: role.id },
      membership: { id: membership.id },
    },
  });
  if (!existing) await assignments.save(assignments.create({ user, role, membership }));
}

if (require.main === module) {
  seedPrivateOrganization().catch(async (error) => {
    console.error(error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exitCode = 1;
  });
}
