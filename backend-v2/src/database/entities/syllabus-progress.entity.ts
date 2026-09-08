import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from "typeorm";
import { Student } from "./student.entity";
import { ExamSyllabus } from "./exam-syllabus.entity";

export enum SyllabusProgressStatus { UNREAD="unread", READ="read", TESTED="tested", REVIEW="review", MASTERED="mastered" }
@Entity("syllabus_progress")
@Unique(["student", "syllabus"])
export class SyllabusProgress {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => Student, { onDelete: "CASCADE" }) student!: Student;
  @Index() @ManyToOne(() => ExamSyllabus, { onDelete: "CASCADE" }) syllabus!: ExamSyllabus;
  @Column({ type: "text", default: SyllabusProgressStatus.UNREAD }) status!: SyllabusProgressStatus;
  @Column({ default: 0 }) accuracy!: number;
  @Column({ default: "" }) note!: string;
  @UpdateDateColumn() updatedAt!: Date;
}
