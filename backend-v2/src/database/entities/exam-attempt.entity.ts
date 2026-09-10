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

  @Column({ default: "active" })
  status!: "active" | "submitted" | "expired" | "cancelled";

  @Column({ type: "datetime", nullable: true })
  expiresAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  submittedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastHeartbeatAt?: Date | null;

  @Column({ default: "" })
  currentSectionId!: string;

  @Column({ type: "float", nullable: true })
  rawScore?: number | null;

  @Column({ type: "float", nullable: true })
  percentage?: number | null;

  @Column({ type: "integer", nullable: true })
  correctCount?: number | null;

  @Column({ type: "integer", nullable: true })
  incorrectCount?: number | null;

  @Column({ type: "integer", nullable: true })
  unansweredCount?: number | null;

  @Column({ type: "simple-json", default: "[]" })
  answers!: Array<{
    questionId: string;
    selectedOption?: string | null;
    marked?: boolean;
    visited?: boolean;
    clientUpdatedAt?: string;
    revision?: number;
    approximateTimeSpentSeconds?: number;
  }>;

  @Column()
  startedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  finishedAt?: Date | null;
}
