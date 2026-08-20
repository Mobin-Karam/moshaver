import { Column, CreateDateColumn, Entity, Index, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Session } from "./session.entity";
import { Student } from "./student.entity";
import { ChatMessage } from "./chat-message.entity";
import { AuditLog } from "./audit-log.entity";

export enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: "varchar", length: 24 })
  role!: UserRole;

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
