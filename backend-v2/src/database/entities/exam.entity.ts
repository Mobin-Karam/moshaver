import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Question } from "./question.entity";
import { ExamAttempt } from "./exam-attempt.entity";
import { ExamAssignment } from "./exam-assignment.entity";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";

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

  @Column({ default: false })
  published!: boolean;

  @Column({ default: "standard" })
  mode!: "standard" | "konkur";

  @Column({ type: "simple-json", default: "[]" })
  instructions!: string[];

  @Column({ default: true })
  allowBackNavigation!: boolean;

  @Column({ type: "simple-json", default: '{"correct":1,"wrong":0,"unanswered":0,"negativeMarking":false}' })
  scoring!: { correct: number; wrong: number; unanswered: number; negativeMarking: boolean };

  @Column({ default: "immediate" })
  resultPolicy!: "immediate" | "scheduled" | "manual";

  @Column({ type: "datetime", nullable: true })
  resultReleaseAt?: Date | null;

  @Column({ default: true })
  resultsReleased!: boolean;

  @Column({ type: "simple-json", default: "[]" })
  sections!: Array<{ id: string; name: string; questionIds: string[]; allocatedMinutes?: number }>;

  @Column({ type: "datetime", nullable: true })
  startTime?: Date | null;

  @Column({ type: "datetime", nullable: true })
  endTime?: Date | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" })
  organization?: Organization | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  createdBy?: User | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @Column({ type: "datetime", nullable: true }) deletedAt?: Date | null;

  @OneToMany(() => Question, (question) => question.exam, { cascade: true })
  questions!: Question[];

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts!: ExamAttempt[];

  @OneToMany(() => ExamAssignment, (assignment) => assignment.exam)
  assignments!: ExamAssignment[];
}
