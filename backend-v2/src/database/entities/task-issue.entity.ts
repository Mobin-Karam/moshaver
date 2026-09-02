import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { Task } from "./task.entity";

@Entity("task_issues")
export class TaskIssue {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  task!: Task;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ length: 120 })
  type!: string;

  @Column({ length: 2000, default: "" })
  description!: string;

  @Column({ type: "varchar", length: 24, default: "OPEN" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}