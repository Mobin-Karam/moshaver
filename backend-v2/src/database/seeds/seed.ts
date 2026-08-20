import "reflect-metadata";
import bcrypt from "bcryptjs";
import dataSource from "../data-source";
import { Student } from "../entities/student.entity";
import { User, UserRole } from "../entities/user.entity";

async function main() {
  await dataSource.initialize();
  const users = dataSource.getRepository(User);
  const students = dataSource.getRepository(Student);

  const admin = await upsertUser(users, "admin", "anonymous", UserRole.ADMIN);
  const saraUser = await upsertUser(users, "sara", "12345678sara", UserRole.STUDENT);

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

  console.log(`Seeded users: ${admin.username}, ${saraUser.username}`);
  await dataSource.destroy();
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
  process.exit(1);
});
