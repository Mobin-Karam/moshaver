import "reflect-metadata";
import bcrypt from "bcryptjs";
import dataSource from "../data-source";
import { Student } from "../entities/student.entity";
import { User, UserRole } from "../entities/user.entity";
import { Role } from "../entities/role.entity";
import { UserRoleAssignment } from "../entities/user-role-assignment.entity";
import { seedSecurityMatrix } from "./security-matrix";
import { Exam } from "../entities/exam.entity";
import { ExamAssignment } from "../entities/exam-assignment.entity";
import { ExamAttempt } from "../entities/exam-attempt.entity";
import { Question } from "../entities/question.entity";

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
  await seedSaraExams(sara, admin);

  console.log(`Seeded base users and Sara exam journey: ${admin.username}, ${saraUser.username}`);
  console.log("Admin v2 role accounts use password: Moshaver-e2e-2026!");
  await dataSource.destroy();
}

async function seedSaraExams(sara: Student, admin: User) {
  const exams = dataSource.getRepository(Exam);
  const questions = dataSource.getRepository(Question);
  const examAssignments = dataSource.getRepository(ExamAssignment);
  const attempts = dataSource.getRepository(ExamAttempt);
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const definitions = [
    {
      title: "آزمون جمع‌بندی زیست‌شناسی سارا",
      subject: "زیست‌شناسی",
      startTime: new Date(now.getTime() - day),
      endTime: new Date(now.getTime() + 7 * day),
      questions: [
        ["محل اصلی انجام فتوسنتز در سلول گیاهی کدام است؟", ["هسته", "کلروپلاست", "ریبوزوم", "واکوئول"], "b", "فتوسنتز در کلروپلاست انجام می‌شود."],
        ["کدام مولکول حامل اطلاعات وراثتی است؟", ["ATP", "DNA", "گلوکز", "هموگلوبین"], "b", "DNA اطلاعات وراثتی را ذخیره می‌کند."],
        ["واحد بنیادی دستگاه عصبی چیست؟", ["نورون", "نفرون", "آلوئول", "پلاکت"], "a", "نورون واحد ساختاری و عملکردی دستگاه عصبی است."],
        ["تبادل گازها در شش عمدتاً در کجا رخ می‌دهد؟", ["نای", "نایژه", "حبابک", "دیافراگم"], "c", "دیواره نازک حبابک‌ها محل تبادل گاز است."],
      ],
      active: true,
    },
    {
      title: "آزمون هفتگی ریاضی سارا",
      subject: "ریاضی",
      startTime: new Date(now.getTime() + 2 * day),
      endTime: new Date(now.getTime() + 4 * day),
      questions: [
        ["حاصل ۳ به توان ۲ کدام است؟", ["۶", "۹", "۱۲", "۱۸"], "b", "سه ضربدر سه برابر ۹ است."],
        ["شیب خط افقی چقدر است؟", ["صفر", "یک", "منفی یک", "تعریف‌نشده"], "a", "تغییرات عمودی خط افقی صفر است."],
        ["مجموع زاویه‌های داخلی مثلث چند درجه است؟", ["۹۰", "۱۸۰", "۲۷۰", "۳۶۰"], "b", "مجموع زاویه‌های هر مثلث ۱۸۰ درجه است."],
      ],
      active: false,
    },
    {
      title: "آزمون مرور شیمی سارا",
      subject: "شیمی",
      startTime: new Date(now.getTime() - 12 * day),
      endTime: new Date(now.getTime() - 9 * day),
      questions: [
        ["عدد اتمی نشان‌دهنده تعداد کدام ذره است؟", ["نوترون", "پروتون", "الکترون و نوترون", "نوکلئون"], "b", "عدد اتمی برابر تعداد پروتون‌های هسته است."],
        ["آب خالص در دمای اتاق چه حالتی دارد؟", ["جامد", "مایع", "گاز", "پلاسما"], "b", "آب در دمای اتاق مایع است."],
        ["نماد شیمیایی اکسیژن چیست؟", ["O", "Ox", "Og", "C"], "a", "نماد عنصر اکسیژن O است."],
      ],
      completed: true,
    },
  ] as const;

  for (const definition of definitions) {
    let exam = await exams.findOne({ where: { title: definition.title }, relations: { questions: true } });
    if (!exam) exam = exams.create({ title: definition.title, questions: [] });
    Object.assign(exam, { subject: definition.subject, duration: 25, attemptLimit: 2, published: true, mode: "mock", lifecycleStatus: "scheduled", navigationMode: "free", timerMode: "whole_exam", allowResume: true, autoSubmitOnTimeout: true, instructions: ["پاسخ‌ها به‌صورت خودکار ذخیره می‌شوند.", "پیش از ثبت نهایی پاسخ‌ها را مرور کن."], allowBackNavigation: true, scoring: { correct: 1, wrong: 0, unanswered: 0, negativeMarking: false }, resultPolicy: "immediate", resultsReleased: true, startTime: definition.startTime, endTime: definition.endTime, createdBy: admin });
    exam = await exams.save(exam);
    for (const [text, options, correctAnswer, explanation] of definition.questions) {
      const existing = await questions.findOne({ where: { exam: { id: exam.id }, text } });
      if (!existing) await questions.save(questions.create({ exam, text, options: [...options], correctAnswer, explanation, subject: definition.subject, topic: "آزمون نمایشی سارا", difficulty: "medium", source: "بذر توسعه", tags: ["sara", "demo"] }));
    }
    const assignment = await examAssignments.findOne({ where: { exam: { id: exam.id }, student: { id: sara.id } } });
    if (!assignment) await examAssignments.save(examAssignments.create({ exam, student: sara, assignedBy: admin }));
    const savedQuestions = await questions.find({ where: { exam: { id: exam.id } } });
    if ("active" in definition && definition.active) {
      const existing = await attempts.findOne({ where: { exam: { id: exam.id }, student: { id: sara.id } } });
      if (!existing) await attempts.save(attempts.create({ exam, student: sara, score: 0, startedAt: new Date(now.getTime() - 6 * 60 * 1000), answers: savedQuestions.slice(0, 1).map((question) => ({ questionId: question.id, selectedOption: "b", visited: true, revision: 1, clientUpdatedAt: now.toISOString() })) }));
    }
    if ("completed" in definition && definition.completed) {
      const existing = await attempts.findOne({ where: { exam: { id: exam.id }, student: { id: sara.id } } });
      if (!existing) await attempts.save(attempts.create({ exam, student: sara, score: 67, startedAt: new Date(now.getTime() - 11 * day), finishedAt: new Date(now.getTime() - 11 * day + 18 * 60 * 1000), answers: savedQuestions.map((question, index) => ({ questionId: question.id, selectedOption: index === 2 ? "b" : question.correctAnswer, visited: true, revision: 1 })) }));
    }
  }
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
