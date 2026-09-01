import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";
import { Task } from "./task.entity";

export enum StudySessionStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  FINISHED = "FINISHED",
}

@Entity("study_sessions")
@Index(["student", "status"])
export class StudySession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  student!: Student;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  task!: Task;

  @Column({ type: "varchar", length: 24, default: StudySessionStatus.ACTIVE })
  status!: StudySessionStatus;

  @Column({ type: "datetime" })
  startedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  lastStartedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastHeartbeatAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  pausedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  finishedAt?: Date | null;

  @Column({ default: 0 })
  elapsedSeconds!: number;

  @Column({ default: 0 })
  actualTests!: number;

  @Column({ default: "" })
  difficulty!: string;

  @Column({ default: "" })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}