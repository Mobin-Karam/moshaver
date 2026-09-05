import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Organization } from "./organization.entity";

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
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" })
  organization?: Organization | null;

  @Column({ type: "varchar", length: 40 })
  type!: string;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column({ default: "general" }) category!: string;
  @Column({ type: "varchar", nullable: true }) url?: string | null;
  @Column({ type: "simple-json", nullable: true }) data?: Record<string, unknown> | null;
  @Column({ default: "normal" }) priority!: string;
  @Column({ type: "datetime", nullable: true }) expiresAt?: Date | null;
  @Column({ type: "varchar", nullable: true }) dedupeKey?: string | null;

  @Column({ type: "datetime", nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
