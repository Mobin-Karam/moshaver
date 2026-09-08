import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Quiz } from "./quiz.entity";
@Entity("quiz_questions")
export class QuizQuestion {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => Quiz, q => q.questions, { onDelete: "CASCADE" }) quiz!: Quiz;
  @Column() text!: string;
  @Column({ type: "simple-json" }) options!: string[];
  @Column() correctAnswer!: string;
  @Column({ default: "" }) explanation!: string;
  @Column({ default: 0 }) sortOrder!: number;
}
