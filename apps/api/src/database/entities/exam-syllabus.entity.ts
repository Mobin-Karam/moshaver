import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Exam } from "./exam.entity";

@Entity("exam_syllabus")
export class ExamSyllabus {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => Exam, { onDelete: "CASCADE" }) exam!: Exam;
  @Column({ length: 200 }) subject!: string;
  @Column({ default: "" }) description!: string;
  @Column({ default: false }) required!: boolean;
  @Column({ default: "" }) track!: string;
}
