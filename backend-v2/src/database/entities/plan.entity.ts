import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";
import { Task } from "./task.entity";

export enum PlanStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

@Entity("plans")
@Index(["student", "date"], { unique: true })
export class Plan {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Student, (student) => student.plans, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ type: "date" })
  date!: string;

  @Column({ type: "varchar", length: 24, default: PlanStatus.DRAFT })
  status!: PlanStatus;

  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @Column({ type: "datetime", nullable: true }) deletedAt?: Date | null;

  @OneToMany(() => Task, (task) => task.plan, { cascade: true })
  tasks!: Task[];
}
