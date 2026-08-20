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

  async list() {
    const exams = await this.exams.find({ relations: { questions: true } });
    return exams.map((exam) => this.publicExam(exam));
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

  async start(examId: string, studentId: string) {
    const exam = await this.exams.findOneByOrFail({ id: examId });
    const student = await this.students.findOneByOrFail({ id: studentId });
    return this.attempts.save(this.attempts.create({ exam, student, startedAt: new Date() }));
  }

  async submit(attemptId: string, score: number) {
    await this.attempts.update(attemptId, { score, finishedAt: new Date() });
    return this.attempts.findOneBy({ id: attemptId });
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

  private publicExam(exam: Exam) {
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
      questions: exam.questions?.map((question) => this.publicQuestion(question)) || [],
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
}
