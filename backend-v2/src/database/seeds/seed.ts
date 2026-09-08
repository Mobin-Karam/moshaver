import "reflect-metadata";
import bcrypt from "bcryptjs";
import dataSource from "../data-source";
import { Student } from "../entities/student.entity";
import { User, UserRole } from "../entities/user.entity";
import { Role } from "../entities/role.entity";
import { UserRoleAssignment } from "../entities/user-role-assignment.entity";
import { seedSecurityMatrix } from "./security-matrix";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to create development seed identities in production.");
  }

  // Keep the default development seed aligned with the accounts offered by
  // Admin v2's role picker. The security matrix also runs pending migrations
  // and creates the organization memberships/relationships required by the
  // authorization context returned after login.
  process.env.ALLOW_E2E_SEED = "true";
  await seedSecurityMatrix();

  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const students = dataSource.getRepository(Student);
  const roles = dataSource.getRepository(Role);
  const assignments = dataSource.getRepository(UserRoleAssignment);

  const admin = await upsertUser(users, "admin", "anonymous", UserRole.ADMIN);
  const saraUser = await upsertUser(users, "sara", "12345678sara", UserRole.STUDENT);
  await ensureRole(assignments, roles, admin, "PLATFORM_ADMIN");
  await ensureRole(assignments, roles, saraUser, "STUDENT");

  let sara = await students.findOne({ where: { user: { id: saraUser.id } }, relations: { user: true } });
  if (!sara) {
    sara = students.create({
      user: saraUser,
      name: "Sara",
      grade: "",
      major: "",
      targetUniversity: "",
      targetField: "",
      targetRank: "",
      dailyCapacity: "",
    });
  } else {
    sara.user = saraUser;
    sara.name = sara.name || "Sara";
  }
  await students.save(sara);

  console.log(`Seeded base users: ${admin.username}, ${saraUser.username}`);
  console.log("Admin v2 role accounts use password: Moshaver-e2e-2026!");
  await dataSource.destroy();
}

async function ensureRole(assignments: ReturnType<typeof dataSource.getRepository<UserRoleAssignment>>, roles: ReturnType<typeof dataSource.getRepository<Role>>, user: User, code: string) {
  const role = await roles.findOne({ where: { code } });
  if (!role) throw new Error(`Seed role is missing: ${code}`);
  const existing = await assignments.findOne({ where: { user: { id: user.id }, role: { id: role.id } } });
  if (!existing) await assignments.save(assignments.create({ user, role, membership: null }));
}

async function upsertUser(users: ReturnType<typeof dataSource.getRepository<User>>, username: string, password: string, role: UserRole) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await users.findOne({ where: { username } });
  if (existing) {
    existing.role = role;
    existing.passwordHash = passwordHash;
    return users.save(existing);
  }
  return users.save(users.create({ username, role, passwordHash }));
}

main().catch((error) => {
  console.error(error);
  if (dataSource.isInitialized) void dataSource.destroy();
  process.exitCode = 1;
});
