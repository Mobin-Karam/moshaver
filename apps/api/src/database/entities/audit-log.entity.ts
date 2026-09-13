import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true, onDelete: "SET NULL" })
  user?: User | null;

  @Column()
  action!: string;

  @Column()
  entity!: string;

  @Column({ type: "simple-json", nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
