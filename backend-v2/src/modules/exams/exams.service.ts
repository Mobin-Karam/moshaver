import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Exam } from "../../database/entities/exam.entity";
import { Question } from "../../database/entities/question.entity";
import { Student } from "../../database/entities/student.entity";
import { CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";
import { ApiException } from "../../common/exceptions/api.exception";
import { ExamAssignment } from "../../database/entities/exam-assignment.entity";
import { User } from "../../database/entities/user.entity";
import { DataSource, In } from "typeorm";
import { Organization } from "../../database/entities/organization.entity";

type QuestionInput = CreateQuestionDto & { question?: string; correctOption?: string };

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(ExamAttempt) private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @Optional() @InjectRepository(ExamAssignment) private readonly assignments?: Repository<ExamAssignment>,
    @Optional() @InjectRepository(User) private readonly users?: Repository<User>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  async list(includeAnswers = true) {
    const exams = await this.exams.find({ relations: { questions: true } });
    return exams.map((exam) => this.publicExam(exam, includeAnswers));
  }

  async listScoped(organizationIds: string[], platform: boolean, includeAnswers = true) {
    const exams = await this.exams.find({ where: platform ? {} : { organization: { id: In(organizationIds) } }, relations: { questions: true, organization: true } });
    return exams.map((exam) => this.publicExam(exam, includeAnswers));
  }

  async organizationIdForExam(id: string) {
    const exam = await this.exams.findOneOrFail({ where: { id }, relations: { organization: true } });
    return exam.organization?.id ?? null;
  }

  async examIdForQuestion(id: string) {
    const question = await this.questions.findOneOrFail({ where: { id }, relations: { exam: true } });
    return question.exam.id;
  }

  async listForStudent(userId: string) {
    const student = await this.studentForUser(userId);
    const assigned = this.assignments ? await this.assignments.find({ where: { student: { id: student.id } }, relations: { exam: true } }) : [];
    const ids = assigned.map((item) => item.exam.id);
    if (this.assignments && !ids.length) return [];
    const exams = await this.exams.find({ where: this.assignments ? { id: In(ids) } : {}, relations: { questions: true, attempts: { student: true } } });
    return exams.map((exam) => this.publicExam(exam, false, student.id));
  }

  async detail(examId: string, userId: string) {
    const student = await this.studentForUser(userId);
    await this.requireAssignment(examId, student.id);
    const exam = await this.exams.findOneOrFail({ where: { id: examId }, relations: { questions: true, attempts: { student: true } } });
    return this.publicExam(exam, false, student.id);
  }

  async history(userId: string) {
    const student = await this.studentForUser(userId);
    const attempts = await this.attempts.find({ where: { student: { id: student.id } }, relations: { exam: true }, order: { startedAt: "DESC" } });
    return attempts.map((attempt) => this.publicAttempt(attempt));
  }

  async progress(examId: string, userId: string) {
    const student = await this.studentForUser(userId);
    const attempt = await this.attempts.findOne({ where: { exam: { id: examId }, student: { id: student.id }, finishedAt: IsNull() }, relations: { exam: { questions: true } }, order: { startedAt: "DESC" } });
    return attempt ? this.attemptProgress(attempt) : null;
  }

  async saveProgress(attemptId: string, answers: Array<{ questionId: string; selectedOption?: string | null }>, userId: string) {
    const student = await this.studentForUser(userId);
    const attempt = await this.attempts.findOneOrFail({ where: { id: attemptId, student: { id: student.id } }, relations: { exam: { questions: true } } });
    if (attempt.finishedAt || this.isExpired(attempt)) throw new ApiException(409, "ATTEMPT_CLOSED", "زمان آزمون به پایان رسیده است.");
    const questionIds = new Set(attempt.exam.questions.map((question) => question.id));
    const validAnswers = answers.filter((answer) => questionIds.has(answer.questionId));
    await this.attempts.update(attemptId, { answers: validAnswers });
    return this.attemptProgress({ ...attempt, answers: validAnswers } as ExamAttempt);
  }

  async create(dto: CreateExamDto & { durationMinutes?: number; maxAttempts?: number; openAt?: string; closeAt?: string; isoDate?: string }, actorUserId?: string) {
    const [organization, createdBy] = await Promise.all([
      dto.organizationId ? this.exams.manager.findOneBy(Organization, { id: dto.organizationId }) : Promise.resolve(null),
      actorUserId ? this.exams.manager.findOneBy(User, { id: actorUserId }) : Promise.resolve(null),
    ]);
    if (dto.organizationId && !organization) throw new ApiException(404, "ORGANIZATION_NOT_FOUND", "سازمان یافت نشد.");
    const exam = this.exams.create({
      title: dto.title,
      subject: dto.subject || "",
      duration: dto.duration || dto.durationMinutes || 1,
      attemptLimit: dto.attemptLimit || dto.maxAttempts || 1,
      startTime: dto.startTime || dto.openAt ? new Date(dto.startTime || dto.openAt || "") : null,
      endTime: dto.endTime || dto.closeAt ? new Date(dto.endTime || dto.closeAt || "") : null,
      questions: (dto.questions || []).map((question) => this.questions.create(this.normalizeQuestion(question))),
      organization,
      createdBy,
    });
    const saved = await this.exams.save(exam);
    return this.publicExam(await this.exams.findOneOrFail({ where: { id: saved.id }, relations: { questions: true } }));
  }

  async update(id: string, body: Record<string, unknown>) {
    const exam = await this.exams.findOneOrFail({ where: { id }, relations: { questions: true } });
    if (typeof body.title === "string") exam.title = body.title;
    if (typeof body.subject === "string") exam.subject = body.subject;
    const duration = body.durationMinutes ?? body.duration;
    if (duration !== undefined) exam.duration = Math.max(1, Number(duration));
    const attempts = body.maxAttempts ?? body.attemptLimit;
    if (attempts !== undefined) exam.attemptLimit = Math.max(1, Number(attempts));
    if (body.openAt !== undefined || body.startTime !== undefined)
      exam.startTime = nullableDate(body.openAt ?? body.startTime);
    if (body.closeAt !== undefined || body.endTime !== undefined)
      exam.endTime = nullableDate(body.closeAt ?? body.endTime);
    await this.exams.save(exam);
    return this.publicExam(exam);
  }

  async remove(id: string) {
    await this.exams.delete(id);
    return { id, deleted: true };
  }

  async start(examId: string, userId: string) {
    const exam = await this.exams.findOneOrFail({ where: { id: examId }, relations: { questions: true } });
    const student = await this.studentForUser(userId);
    await this.requireAssignment(examId, student.id);
    const active = await this.attempts.findOne({ where: { exam: { id: examId }, student: { id: student.id }, finishedAt: IsNull() }, relations: { exam: { questions: true } }, order: { startedAt: "DESC" } });
    if (active) return this.attemptProgress(active);
    const used = await this.attempts.count({ where: { exam: { id: examId }, student: { id: student.id } } });
    if (used >= exam.attemptLimit) throw new ApiException(409, "ATTEMPT_LIMIT_REACHED", "تعداد دفعات مجاز آزمون تکمیل شده است.");
    const attempt = await this.attempts.save(this.attempts.create({ exam, student, startedAt: new Date() }));
    return this.attemptProgress({ ...attempt, exam, answers: [] } as ExamAttempt);
  }

  async submit(attemptId: string, answers: Array<{ questionId: string; selectedOption?: string | null }> = [], userId: string) {
    const student = await this.studentForUser(userId);
    const attempt = await this.attempts.findOneOrFail({ where: { id: attemptId, student: { id: student.id } }, relations: { exam: { questions: true } } });
    if (attempt.finishedAt) return this.result(attempt, attempt.answers || []);
    const finalAnswers = this.isExpired(attempt) ? (attempt.answers || []) : answers;
    const answerMap = new Map(finalAnswers.map((answer) => [answer.questionId, answer.selectedOption || ""]));
    const questions = attempt.exam.questions || [];
    const correct = questions.filter((question) => answerMap.get(question.id) === question.correctAnswer).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const finishedAt = new Date();
    await this.attempts.update(attemptId, { answers: finalAnswers, score, finishedAt });
    return this.result({ ...attempt, answers: finalAnswers, score, finishedAt } as ExamAttempt, finalAnswers);
  }

  async submitExam(examId: string, answers: Array<{ questionId: string; selectedOption?: string | null }> = [], userId: string) {
    const student = await this.studentForUser(userId);
    await this.requireAssignment(examId, student.id);
    const attempt = await this.attempts.findOne({ where: { exam: { id: examId }, student: { id: student.id }, finishedAt: IsNull() }, order: { startedAt: "DESC" } });
    if (!attempt) throw new ApiException(409, "NO_ACTIVE_ATTEMPT", "تلاش فعالی برای این آزمون وجود ندارد.");
    return this.submit(attempt.id, answers, userId);
  }

  private result(attempt: ExamAttempt, answers: Array<{ questionId: string; selectedOption?: string | null }>) {
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption || ""]));
    const questions = attempt.exam.questions || [];
    const correct = questions.filter((question) => answerMap.get(question.id) === question.correctAnswer).length;
    return {
      id: attempt.id, score: attempt.score, correct, total: questions.length, finishedAt: attempt.finishedAt,
      review: questions.map((question) => ({ questionId: question.id, question: question.text, selectedOption: answerMap.get(question.id) || null, correctOption: question.correctAnswer, explanation: question.explanation, isCorrect: answerMap.get(question.id) === question.correctAnswer })),
    };
  }

  private async studentForUser(userId: string) {
    return this.students.findOneOrFail({ where: { user: { id: userId } } });
  }

  private isExpired(attempt: ExamAttempt) {
    const durationEnd = new Date(attempt.startedAt.getTime() + attempt.exam.duration * 60_000);
    const deadline = attempt.exam.endTime && attempt.exam.endTime < durationEnd ? attempt.exam.endTime : durationEnd;
    return new Date() >= deadline;
  }

  private attemptProgress(attempt: ExamAttempt) {
    const durationEnd = new Date(attempt.startedAt.getTime() + attempt.exam.duration * 60_000);
    const deadline = attempt.exam.endTime && attempt.exam.endTime < durationEnd ? attempt.exam.endTime : durationEnd;
    return {
      runId: attempt.id, startedAt: attempt.startedAt, examCloseAt: attempt.exam.endTime || null, finishedAt: attempt.finishedAt || null,
      savedAnswers: attempt.answers || [], remainingSeconds: Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000)),
      quiz: { id: attempt.exam.id, examId: attempt.exam.id, title: attempt.exam.title, durationMinutes: attempt.exam.duration,
        questions: (attempt.exam.questions || []).map((question) => ({ id: question.id, question: question.text, options: this.fourOptions(question.options) })) },
    };
  }

  private publicAttempt(attempt: ExamAttempt, fallbackExamId?: string) {
    return { id: attempt.id, examId: attempt.exam?.id ?? fallbackExamId, title: attempt.exam?.title ?? "", score: attempt.score, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt || null, answeredCount: (attempt.answers || []).filter((answer) => answer.selectedOption).length };
  }

  private publicExam(exam: Exam, includeAnswers = true, studentId?: string) {
    const studentAttempts = studentId ? (exam.attempts || []).filter((attempt) => attempt.student?.id === studentId) : [];
    return {
      id: exam.id, title: exam.title, subject: exam.subject, duration: exam.duration, durationMinutes: exam.duration, attemptLimit: exam.attemptLimit, maxAttempts: exam.attemptLimit, startTime: exam.startTime, endTime: exam.endTime, openAt: exam.startTime?.toISOString(), closeAt: exam.endTime?.toISOString(), isoDate: exam.startTime?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10), published: true,
      questions: includeAnswers ? exam.questions?.map((question) => this.publicQuestion(question)) || [] : undefined,
      delivery: { questionCount: exam.questions?.length || 0, allowedAttempts: exam.attemptLimit, attemptsUsed: studentId ? studentAttempts.length : 0, lastAttempt: studentAttempts[0] ? this.publicAttempt(studentAttempts[0], exam.id) : null },
    };
  }

  async questionsForExam(examId: string) {
    const exam = await this.exams.findOneOrFail({ where: { id: examId }, relations: { questions: true } });
    return exam.questions.map((question) => this.publicQuestion(question));
  }

  async addQuestion(examId: string, question: QuestionInput) {
    const exam = await this.exams.findOneByOrFail({ id: examId });
    const saved = await this.questions.save(this.questions.create({ ...this.normalizeQuestion(question), exam }));
    return this.publicQuestion(saved);
  }

  async updateQuestion(id: string, body: Record<string, unknown>) {
    const question = await this.questions.findOneOrFail({ where: { id } });
    if (typeof body.text === "string" || typeof body.question === "string")
      question.text = String(body.text ?? body.question);
    if (Array.isArray(body.options)) question.options = body.options.map(String);
    if (typeof body.correctAnswer === "string" || typeof body.correctOption === "string")
      question.correctAnswer = String(body.correctAnswer ?? body.correctOption);
    if (typeof body.explanation === "string") question.explanation = body.explanation;
    return this.publicQuestion(await this.questions.save(question));
  }

  async deleteQuestion(id: string, examId?: string) {
    const question = await this.questions.findOneOrFail({ where: { id }, relations: { exam: true } });
    if (examId && question.exam.id !== examId)
      throw new ApiException(404, "NOT_FOUND", "سؤال برای این آزمون پیدا نشد.");
    await this.questions.delete(id);
    return { id, deleted: true };
  }

  async historyForStudent(studentId: string) {
    const attempts = await this.attempts.find({
      where: { student: { id: studentId } },
      relations: { exam: true },
      order: { startedAt: "DESC" },
    });
    return attempts.map((attempt) => this.publicAttempt(attempt));
  }

  async attemptForStudent(studentId: string, attemptId: string) {
    const attempt = await this.attempts.findOneOrFail({
      where: { id: attemptId, student: { id: studentId } },
      relations: { exam: { questions: true }, student: true },
    });
    return {
      ...this.publicAttempt(attempt),
      studentId,
      result: this.result(attempt, attempt.answers || []),
    };
  }

  importQuestions(examId: string, questions: CreateExamDto["questions"] = []) {
    return this.exams.findOneByOrFail({ id: examId }).then((exam) =>
      this.questions.save(questions.map((question) => this.questions.create({ ...this.normalizeQuestion(question), exam }))),
    );
  }

  async assign(examId: string, studentIds: string[], actorUserId: string) {
    if (!this.assignments || !this.users || !this.dataSource) throw new ApiException(503, "ASSIGNMENTS_UNAVAILABLE", "تخصیص آزمون در دسترس نیست.");
    return this.dataSource.transaction(async (manager) => {
      const exam = await manager.findOne(Exam, { where: { id: examId } });
      const actor = await manager.findOne(User, { where: { id: actorUserId } });
      const students = await manager.find(Student, { where: { id: In([...new Set(studentIds)]) } });
      if (!exam || !actor || students.length !== new Set(studentIds).size) throw new ApiException(404, "NOT_FOUND", "آزمون، کاربر یا دانش‌آموز یافت نشد.");
      for (const student of students) {
        const exists = await manager.findOne(ExamAssignment, { where: { exam: { id: examId }, student: { id: student.id } } });
        if (!exists) await manager.save(ExamAssignment, manager.create(ExamAssignment, { exam, student, assignedBy: actor }));
      }
      return { examId, studentIds: students.map((student) => student.id) };
    });
  }

  async unassign(examId: string, studentId: string) {
    if (!this.assignments) throw new ApiException(503, "ASSIGNMENTS_UNAVAILABLE", "تخصیص آزمون در دسترس نیست.");
    const result = await this.assignments.delete({ exam: { id: examId }, student: { id: studentId } });
    if (!result.affected) throw new ApiException(404, "NOT_FOUND", "تخصیص آزمون یافت نشد.");
    return { examId, studentId, removed: true };
  }

  private async requireAssignment(examId: string, studentId: string) {
    if (!this.assignments) return;
    const assignment = await this.assignments.findOne({ where: { exam: { id: examId }, student: { id: studentId } } });
    if (!assignment) throw new ApiException(404, "EXAM_NOT_ASSIGNED", "آزمون برای این دانش‌آموز در دسترس نیست.");
  }

  private normalizeQuestion(question: QuestionInput) {
    return {
      text: question.text || question.question || "",
      options: question.options || [],
      correctAnswer: question.correctAnswer || question.correctOption || "",
      explanation: question.explanation || "",
    };
  }

  private publicQuestion(question: Question) {
    return {
      id: question.id,
      text: question.text,
      question: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      correctOption: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  private fourOptions(options: string[]) {
    const normalized = [...(options || [])].slice(0, 4);
    while (normalized.length < 4) normalized.push("");
    return normalized as [string, string, string, string];
  }
}

function nullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
