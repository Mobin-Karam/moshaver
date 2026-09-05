import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Exam } from "./exam.entity";
import { Organization } from "./organization.entity";
import { QuizQuestion } from "./quiz-question.entity";

@Entity("quizzes")
export class Quiz {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 220 }) title!: string;
  @Column({ default: "" }) subject!: string;
  @Column({ default: 20 }) durationMinutes!: number;
  @Column({ default: true }) active!: boolean;
  @Index() @ManyToOne(() => Exam, { nullable: true, onDelete: "CASCADE" }) exam?: Exam | null;
  @Index() @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" }) organization?: Organization | null;
  @OneToMany(() => QuizQuestion, q => q.quiz, { cascade: true }) questions!: QuizQuestion[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
