import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Quiz } from "./quiz.entity";
import { Student } from "./student.entity";
@Entity("quiz_attempts")
export class QuizAttempt {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => Quiz, { onDelete: "CASCADE" }) quiz!: Quiz;
  @Index() @ManyToOne(() => Student, { onDelete: "CASCADE" }) student!: Student;
  @Column() startedAt!: Date;
  @Column({ type: "datetime", nullable: true }) submittedAt?: Date | null;
  @Column({ type: "simple-json", default: "[]" }) answers!: Array<{questionId:string;selectedOption?:string|null}>;
  @Column({ default: 0 }) correct!: number;
  @Column({ default: 0 }) wrong!: number;
  @Column({ default: 0 }) blank!: number;
  @Column({ default: 0 }) percent!: number;
}
