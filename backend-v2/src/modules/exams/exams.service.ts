import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Exam } from "../../database/entities/exam.entity";
import { Question } from "../../database/entities/question.entity";
import { Student } from "../../database/entities/student.entity";
import { CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";
import { ApiException } from "../../common/exceptions/api.exception";

type QuestionInput = CreateQuestionDto & { question?: string; correctOption?: string };

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam) private readonly exams: Repository<Exam>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(ExamAttempt) private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
  ) {}

  async list(includeAnswers = true) {
    const exams = await this.exams.find({ relations: { questions: true } });
    return exams.map((exam) => this.publicExam(exam, includeAnswers));
  }

  async listForStudent(userId: string) {
    const student = await this.studentForUser(userId);
    const exams = await this.exams.find({ relations: { questions: true, attempts: { student: true } } });
    return exams.map((exam) => this.publicExam(exam, false, student.id));
  }

  async detail(examId: string, userId: string) {
    const student = await this.studentForUser(userId);
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

  create(dto: CreateExamDto & { durationMinutes?: number; maxAttempts?: number; openAt?: string; closeAt?: string; isoDate?: string }) {
    const exam = this.exams.create({
      title: dto.title,
      subject: dto.subject || "",
      duration: dto.duration || dto.durationMinutes || 1,
      attemptLimit: dto.attemptLimit || dto.maxAttempts || 1,
      startTime: dto.startTime || dto.openAt ? new Date(dto.startTime || dto.openAt || "") : null,
      endTime: dto.endTime || dto.closeAt ? new Date(dto.endTime || dto.closeAt || "") : null,
      questions: (dto.questions || []).map((question) => this.questions.create(this.normalizeQuestion(question))),
    });
    return this.exams.save(exam).then((saved) => this.exams.findOneOrFail({ where: { id: saved.id }, relations: { questions: true } })).then((saved) => this.publicExam(saved));
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

  private publicAttempt(attempt: ExamAttempt) {
    return { id: attempt.id, examId: attempt.exam.id, title: attempt.exam.title, score: attempt.score, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt || null, answeredCount: (attempt.answers || []).filter((answer) => answer.selectedOption).length };
  }

  private publicExam(exam: Exam, includeAnswers = true, studentId?: string) {
    const studentAttempts = studentId ? (exam.attempts || []).filter((attempt) => attempt.student?.id === studentId) : [];
    return {
      id: exam.id, title: exam.title, subject: exam.subject, duration: exam.duration, durationMinutes: exam.duration, attemptLimit: exam.attemptLimit, maxAttempts: exam.attemptLimit, startTime: exam.startTime, endTime: exam.endTime, openAt: exam.startTime?.toISOString(), closeAt: exam.endTime?.toISOString(), isoDate: exam.startTime?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10), published: true,
      questions: includeAnswers ? exam.questions?.map((question) => this.publicQuestion(question)) || [] : undefined,
      delivery: { questionCount: exam.questions?.length || 0, allowedAttempts: exam.attemptLimit, attemptsUsed: studentId ? studentAttempts.length : 0, lastAttempt: studentAttempts[0] ? this.publicAttempt(studentAttempts[0]) : null },
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
