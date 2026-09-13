import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";
import { RelaxationTrack } from "./relaxation-track.entity";

@Entity("student_daily_relaxations")
@Index(["student", "date"], { unique: true })
export class StudentDailyRelaxation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Student, { onDelete: "CASCADE" }) student!: Student;
  @ManyToOne(() => RelaxationTrack, (track) => track.selections, { onDelete: "RESTRICT" }) track!: RelaxationTrack;
  @Column({ length: 10 }) date!: string;
  @Column({ length: 12, default: "AUTO" }) selectedBy!: "AUTO" | "STUDENT";
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
