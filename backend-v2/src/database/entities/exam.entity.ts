import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Question } from "./question.entity";
import { ExamAttempt } from "./exam-attempt.entity";

@Entity("exams")
export class Exam {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 220 })
  title!: string;

  @Column({ default: "" })
  subject!: string;

  @Column({ default: 0 })
  duration!: number;

  @Column({ default: 1 })
  attemptLimit!: number;

  @Column({ type: "datetime", nullable: true })
  startTime?: Date | null;

  @Column({ type: "datetime", nullable: true })
  endTime?: Date | null;

  @OneToMany(() => Question, (question) => question.exam, { cascade: true })
  questions!: Question[];

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts!: ExamAttempt[];
}
