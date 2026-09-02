import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";
import { LearningReview } from "./learning-review.entity";

export enum LearningStatus {
  PENDING = "pending",
  DONE = "done",
  ARCHIVED = "archived",
}

@Entity("learning_items")
@Index(["student", "dueDate"])
export class LearningItem {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Student, (student) => student.learningItems, { onDelete: "CASCADE" }) student!: Student;
  @Column({ default: "" }) subject!: string;
  @Column({ default: "" }) book!: string;
  @Column({ default: "" }) chapter!: string;
  @Column({ default: "" }) lesson!: string;
  @Column({ default: "" }) topic!: string;
  @Column({ length: 2000 }) title!: string;
  @Column({ type: "text", default: "" }) note!: string;
  @Column({ type: "text", default: "" }) hint!: string;
  @Column({ type: "date" }) dueDate!: string;
  @Column({ default: 1 }) intervalDays!: number;
  @Column({ default: 0 }) reviewCount!: number;
  @Column({ type: "float", default: 0 }) mastery!: number;
  @Column({ type: "varchar", length: 24, default: LearningStatus.PENDING }) status!: LearningStatus;
  @Column({ type: "datetime", nullable: true }) completedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @OneToMany(() => LearningReview, (review) => review.item) reviews!: LearningReview[];
}
