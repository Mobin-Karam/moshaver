import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExamAttempt } from "../../database/entities/exam-attempt.entity";
import { Exam } from "../../database/entities/exam.entity";
import { Question } from "../../database/entities/question.entity";
import { Student } from "../../database/entities/student.entity";
import { CreateExamDto, CreateQuestionDto } from "./dto/create-exam.dto";

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

  async start(examId: string, userId: string) {
    const exam = await this.exams.findOneOrFail({ where: { id: examId }, relations: { questions: true } });
    const student = await this.students.findOneOrFail({ where: { user: { id: userId } } });
    const attempt = await this.attempts.save(this.attempts.create({ exam, student, startedAt: new Date() }));
    return {
      runId: attempt.id,
      startedAt: attempt.startedAt,
      examCloseAt: exam.endTime,
      quiz: {
        id: exam.id,
        examId: exam.id,
        title: exam.title,
        durationMinutes: exam.duration,
        questions: (exam.questions || []).map((question) => ({
          id: question.id,
          question: question.text,
          options: this.fourOptions(question.options),
        })),
      },
    };
  }

  async submit(attemptId: string, answers: Array<{ questionId: string; selectedOption?: string | null }> = []) {
    const attempt = await this.attempts.findOneOrFail({ where: { id: attemptId }, relations: { exam: { questions: true } } });
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption || ""]));
    const questions = attempt.exam.questions || [];
    const correct = questions.filter((question) => answerMap.get(question.id) === question.correctAnswer).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    await this.attempts.update(attemptId, { score, finishedAt: new Date() });
    return {
      id: attemptId,
      score,
      correct,
      total: questions.length,
      finishedAt: new Date(),
      review: questions.map((question) => ({
        questionId: question.id,
        question: question.text,
        selectedOption: answerMap.get(question.id) || null,
        correctOption: question.correctAnswer,
        explanation: question.explanation,
        isCorrect: answerMap.get(question.id) === question.correctAnswer,
      })),
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

  private publicExam(exam: Exam, includeAnswers = true) {
    return {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      duration: exam.duration,
      durationMinutes: exam.duration,
      attemptLimit: exam.attemptLimit,
      maxAttempts: exam.attemptLimit,
      startTime: exam.startTime,
      endTime: exam.endTime,
      openAt: exam.startTime?.toISOString(),
      closeAt: exam.endTime?.toISOString(),
      isoDate: exam.startTime?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
      published: true,
      questions: includeAnswers ? exam.questions?.map((question) => this.publicQuestion(question)) || [] : undefined,
      delivery: { questionCount: exam.questions?.length || 0, allowedAttempts: exam.attemptLimit, attemptsUsed: 0 },
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
