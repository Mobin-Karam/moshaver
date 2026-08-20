import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "./student.entity";

export enum NotificationType {
  PLAN_UPDATE = "PLAN_UPDATE",
  EXAM_REMINDER = "EXAM_REMINDER",
  MESSAGE = "MESSAGE",
  WARNING = "WARNING",
  MOTIVATION = "MOTIVATION",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Student, (student) => student.notifications, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ type: "varchar", length: 40 })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ type: "datetime", nullable: true })
  readAt?: Date | null;
}
