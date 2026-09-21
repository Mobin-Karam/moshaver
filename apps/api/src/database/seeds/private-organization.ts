import "reflect-metadata";
import bcrypt from "bcryptjs";
import { EntityManager, IsNull } from "typeorm";
import dataSource from "../data-source";
import {
  MembershipStatus,
  OrganizationMembership,
} from "../entities/organization-membership.entity";
import {
  Organization,
  OrganizationStatus,
  OrganizationType,
} from "../entities/organization.entity";
import { Role } from "../entities/role.entity";
import { Student } from "../entities/student.entity";
import {
  RelationshipStatus,
  RelationshipType,
  UserRelationship,
} from "../entities/user-relationship.entity";
import { UserRoleAssignment } from "../entities/user-role-assignment.entity";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { seedEducationCatalog } from "../../modules/education-catalog/education-catalog.service";
import {
  isValidIranianNationalCode,
  normalizeNationalCode,
} from "../../modules/onboarding/national-code";

const DEVELOPMENT_PASSWORD = "Moshaver-development-2026!";
const DEVELOPMENT_NATIONAL_CODE = "1000000001";

export type PrivateOrganizationSeedConfig = {
  production: boolean;
  organizationName: string;
  passwords: Record<PrivateOrganizationAccount, string>;
  studentNationalCode: string;
};

const PRIVATE_ORGANIZATION_ACCOUNTS = {
  platformAdmin: {
    username: "mobinkaram.platform",
    firstName: "مدیر",
    lastName: "سامانه",
    role: UserRole.PLATFORM_ADMIN,
    passwordEnv: "PRIVATE_ORG_PLATFORM_ADMIN_PASSWORD",
  },
  organizationAdmin: {
    username: "mobinkaram.orgadmin",
    firstName: "مدیر",
    lastName: "سازمان",
    role: UserRole.ORGANIZATION_ADMIN,
    passwordEnv: "PRIVATE_ORG_ORGANIZATION_ADMIN_PASSWORD",
  },
  advisor: {
    username: "mobinkaram",
    firstName: "مبین",
    lastName: "کرام",
    role: UserRole.ADVISOR,
    passwordEnv: "MOBINKARAM_PASSWORD",
    relationship: RelationshipType.ADVISOR_OF,
  },
  teacher: {
    username: "mobinkaram.teacher",
    firstName: "معلم",
    lastName: "مه‌کارام",
    role: UserRole.TEACHER,
    passwordEnv: "PRIVATE_ORG_TEACHER_PASSWORD",
    relationship: RelationshipType.TEACHER_OF,
  },
  mentor: {
    username: "mobinkaram.mentor",
    firstName: "مربی",
    lastName: "مه‌کارام",
    role: UserRole.MENTOR,
    passwordEnv: "PRIVATE_ORG_MENTOR_PASSWORD",
    relationship: RelationshipType.MENTOR_OF,
  },
  contentManager: {
    username: "mobinkaram.content",
    firstName: "مدیر محتوا",
    lastName: "مه‌کارام",
    role: UserRole.CONTENT_MANAGER,
    passwordEnv: "PRIVATE_ORG_CONTENT_MANAGER_PASSWORD",
  },
  guardian: {
    username: "mahakaram.guardian",
    firstName: "ولی",
    lastName: "مه‌کارام",
    role: UserRole.GUARDIAN,
    passwordEnv: "PRIVATE_ORG_GUARDIAN_PASSWORD",
    relationship: RelationshipType.GUARDIAN_OF,
  },
  student: {
    username: "mahakaram",
    firstName: "مها",
    lastName: "کرام",
    role: UserRole.STUDENT,
    passwordEnv: "MAHAKARAM_PASSWORD",
  },
} as const;

type PrivateOrganizationAccount = keyof typeof PRIVATE_ORGANIZATION_ACCOUNTS;

export function resolvePrivateOrganizationSeedConfig(
  env: NodeJS.ProcessEnv = process.env,
): PrivateOrganizationSeedConfig {
  const production = env.NODE_ENV === "production";
  if (production && env.ALLOW_PRODUCTION_BOOTSTRAP !== "true") {
    throw new Error(
      "Refusing production bootstrap: set ALLOW_PRODUCTION_BOOTSTRAP=true for this one-time operation.",
    );
  }

  const passwords = Object.fromEntries(
    Object.entries(PRIVATE_ORGANIZATION_ACCOUNTS).map(([key, account]) => [
      key,
      env[account.passwordEnv] || (production ? "" : DEVELOPMENT_PASSWORD),
    ]),
  ) as Record<PrivateOrganizationAccount, string>;
  if (Object.values(passwords).some((password) => password.length < 12)) {
    throw new Error(
      "Bootstrap passwords must be provided and contain at least 12 characters.",
    );
  }
  if (
    production &&
    new Set(Object.values(passwords)).size !== Object.keys(passwords).length
  ) {
    throw new Error(
      "Every production bootstrap account must use a different password.",
    );
  }

  const studentNationalCode = normalizeNationalCode(
    env.MAHAKARAM_NATIONAL_CODE ||
      (production ? "" : DEVELOPMENT_NATIONAL_CODE),
  );
  if (!isValidIranianNationalCode(studentNationalCode)) {
    throw new Error(
      "MAHAKARAM_NATIONAL_CODE must be a valid Iranian national code.",
    );
  }

  return {
    production,
    organizationName:
      env.PRIVATE_ORGANIZATION_NAME?.trim() || "سازمان خصوصی مه‌کارام",
    passwords,
    studentNationalCode,
  };
}

export async function seedPrivateOrganization(
  config = resolvePrivateOrganizationSeedConfig(),
) {
  await dataSource.initialize();
  await dataSource.runMigrations();
  try {
    const summary = await dataSource.transaction((manager) =>
      seed(manager, config),
    );
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await dataSource.destroy();
  }
}

async function seed(
  manager: EntityManager,
  config: PrivateOrganizationSeedConfig,
) {
  const organizations = manager.getRepository(Organization);
  let organization = await organizations.findOne({
    where: { name: config.organizationName },
  });
  if (!organization)
    organization = organizations.create({ name: config.organizationName });
  organization.type = OrganizationType.PRIVATE_PRACTICE;
  organization.status = OrganizationStatus.ACTIVE;
  organization = await organizations.save(organization);

  const seededAccounts = await Promise.all(
    Object.entries(PRIVATE_ORGANIZATION_ACCOUNTS).map(
      async ([key, account]) => {
        const accountKey = key as PrivateOrganizationAccount;
        const user = await upsertUser(
          manager,
          account.username,
          account.firstName,
          account.lastName,
          account.role,
          config.passwords[accountKey],
        );
        const membership = await ensureMembership(manager, user, organization);
        await ensureRole(
          manager,
          user,
          account.role,
          account.role === UserRole.PLATFORM_ADMIN ? null : membership,
        );
        return { key: accountKey, account, user };
      },
    ),
  );
  const studentUser = seededAccounts.find(({ key }) => key === "student")!.user;

  const students = manager.getRepository(Student);
  let student = await students.findOne({
    where: { user: { id: studentUser.id } },
    relations: { user: true },
  });
  if (!student)
    student = students.create({ user: studentUser, name: "مها کرام" });
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

  for (const { account, user } of seededAccounts) {
    if ("relationship" in account) {
      await ensureRelationship(
        manager,
        user,
        student,
        organization,
        account.relationship,
      );
    }
  }

  const textbooks = await seedEducationCatalog(manager);
  return {
    mode: config.production ? "production" : "development",
    organization: {
      id: organization.id,
      name: organization.name,
      type: organization.type,
    },
    users: seededAccounts.map(({ user, account }) => ({
      username: user.username,
      role: account.role,
    })),
    student: {
      id: student.id,
      gradeId: student.gradeId,
      trackId: student.trackId,
    },
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

async function ensureMembership(
  manager: EntityManager,
  user: User,
  organization: Organization,
) {
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
  code: Exclude<UserRole, UserRole.ADMIN>,
  membership: OrganizationMembership | null,
) {
  const role = await manager.getRepository(Role).findOneByOrFail({ code });
  const assignments = manager.getRepository(UserRoleAssignment);
  const existing = await assignments.findOne({
    where: {
      user: { id: user.id },
      role: { id: role.id },
      membership: membership ? { id: membership.id } : IsNull(),
    },
  });
  if (!existing)
    await assignments.save(assignments.create({ user, role, membership }));
}

async function ensureRelationship(
  manager: EntityManager,
  fromUser: User,
  student: Student,
  organization: Organization,
  type: RelationshipType,
) {
  const relationships = manager.getRepository(UserRelationship);
  let relationship = await relationships.findOne({
    where: {
      fromUser: { id: fromUser.id },
      toStudent: { id: student.id },
      organization: { id: organization.id },
      type,
    },
  });
  if (!relationship) {
    relationship = relationships.create({
      fromUser,
      toStudent: student,
      organization,
      type,
    });
  }
  relationship.status = RelationshipStatus.ACTIVE;
  relationship.acceptedAt ??= new Date();
  relationship.revokedAt = null;
  await relationships.save(relationship);
}

if (require.main === module) {
  seedPrivateOrganization().catch(async (error) => {
    console.error(error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exitCode = 1;
  });
}
