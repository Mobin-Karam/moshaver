import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Student } from "./student.entity";

export enum RecoveryRequestStatus {
  PENDING = "pending",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

@Entity("recovery_requests")
export class RecoveryRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Student, (student) => student.recoveryRequests, { onDelete: "CASCADE" })
  student!: Student;

  @Column({ type: "date" })
  planDate!: string;

  @Column({ type: "varchar", length: 200, default: "" })
  reason!: string;

  @Column({ type: "varchar", length: 1500, default: "" })
  note!: string;

  @Column({ type: "varchar", length: 24, default: RecoveryRequestStatus.PENDING })
  status!: RecoveryRequestStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}