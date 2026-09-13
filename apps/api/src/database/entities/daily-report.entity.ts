import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";

@Entity("daily_reports")
@Index(["student", "planDate"], { unique: true })
export class DailyReport {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Student, (student) => student.dailyReports, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ type: "date" })
  planDate!: string;

  @Column({ type: "float", default: 0 })
  studyHours!: number;

  @Column({ default: 0 })
  tests!: number;

  @Column({ default: 0 })
  correct!: number;

  @Column({ default: 0 })
  wrong!: number;

  @Column({ default: 0 })
  blank!: number;

  @Column({ default: 0 })
  focus!: number;

  @Column({ default: 0 })
  fatigue!: number;

  @Column({ default: 0 })
  motivation!: number;

  @Column({ type: "varchar", length: 2000, default: "" })
  problem!: string;

  @Column({ type: "varchar", length: 2000, default: "" })
  tomorrow!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}