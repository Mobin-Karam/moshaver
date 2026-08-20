import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Exam } from "./exam.entity";
import { Student } from "./student.entity";

@Entity("exam_attempts")
export class ExamAttempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: "CASCADE" })
  exam!: Exam;

  @Index()
  @ManyToOne(() => Student, (student) => student.examAttempts, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ default: 0 })
  score!: number;

  @Column()
  startedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  finishedAt?: Date | null;
}
