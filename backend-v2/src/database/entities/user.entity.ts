import { Column, CreateDateColumn, Entity, Index, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Session } from "./session.entity";
import { Student } from "./student.entity";
import { ChatMessage } from "./chat-message.entity";
import { AuditLog } from "./audit-log.entity";

export enum UserRole {
  /** @deprecated migration compatibility only */
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  GUARDIAN = "GUARDIAN",
  ADVISOR = "ADVISOR",
  TEACHER = "TEACHER",
  MENTOR = "MENTOR",
  CONTENT_MANAGER = "CONTENT_MANAGER",
  ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN",
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
}

export enum UserStatus { ACTIVE = "ACTIVE", DISABLED = "DISABLED", ARCHIVED = "ARCHIVED" }

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  username!: string;

  @Column()
  passwordHash!: string;

  /** @deprecated Read only as a bridge for pre-RBAC databases. */
  @Column({ type: "varchar", length: 24, nullable: true })
  role!: UserRole;

  @Column({ length: 100, default: "" }) firstName!: string;
  @Column({ length: 100, default: "" }) lastName!: string;
  @Column({ type: "varchar", length: 20, default: UserStatus.ACTIVE }) status!: UserStatus;
  @Column({ length: 12, default: "fa-IR" }) locale!: string;
  @Column({ length: 64, default: "Asia/Tehran" }) timezone!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions!: Session[];

  @OneToOne(() => Student, (student) => student.user)
  student?: Student;

  @OneToMany(() => ChatMessage, (message) => message.sender)
  sentMessages!: ChatMessage[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs!: AuditLog[];
}
