import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";
import { Task } from "./task.entity";

@Entity("task_comments")
export class TaskComment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  task!: Task;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ length: 2000 })
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;
}