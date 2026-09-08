import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Plan } from "./plan.entity";

export enum TaskType {
  STUDY = "STUDY",
  TEST = "TEST",
  REVIEW = "REVIEW",
  EXAM = "EXAM",
  REST = "REST",
  CUSTOM = "CUSTOM",
}

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Plan, (plan) => plan.tasks, { onDelete: "CASCADE" })
  plan!: Plan;

  @Column({ type: "varchar", length: 24 })
  type!: TaskType;

  @Column({ length: 220 })
  title!: string;

  @Column({ default: "" })
  subject!: string;

  @Column({ default: "" })
  description!: string;

  @Column({ default: "" })
  startTime!: string;

  @Column({ default: "" })
  endTime!: string;

  @Column({ default: 0 })
  duration!: number;

  @Column({ default: 0 })
  testCount!: number;

  @Column({ default: "" })
  note!: string;

  @Column({ type: "varchar", length: 24, default: "PLANNED" })
  status!: string;

  @Column({ default: 0 })
  priority!: number;

  @Column({ type: "datetime", nullable: true })
  completedAt?: Date | null;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @Column({ type: "datetime", nullable: true }) deletedAt?: Date | null;
}
