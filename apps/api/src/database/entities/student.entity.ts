import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Plan } from "./plan.entity";
import { ExamAttempt } from "./exam-attempt.entity";
import { DailyReport } from "./daily-report.entity";
import { RecoveryRequest } from "./recovery-request.entity";
import { LearningItem } from "./learning-item.entity";

@Entity("students")
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => User, (user) => user.student, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn()
  user?: User | null;

  @Column({ length: 160 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 10, nullable: true })
  nationalCode?: string | null;

  @Column({ type: "integer", nullable: true })
  gradeId?: number | null;

  @Column({ length: 40, default: "general" })
  educationTypeId!: string;

  @Column({ length: 80, default: "general" })
  trackId!: string;

  @Column({ default: "" })
  grade!: string;

  @Column({ default: "" })
  major!: string;

  @Column({ default: "" })
  targetUniversity!: string;

  @Column({ default: "" })
  targetField!: string;

  @Column({ default: "" })
  targetRank!: string;

  @Column({ default: "" })
  dailyCapacity!: string;

  @Column({ default: "active" })
  accountStatus!: "active" | "inactive" | "archived";

  @Column({ length: 32, default: "ASSIGNED" })
  onboardingStatus!: "PENDING_ASSIGNMENT" | "ASSIGNED";

  @Column({ default: false })
  guardianChatReadOnly!: boolean;
  @Column({ type: "datetime", nullable: true })
  guardianChangedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Plan, (plan) => plan.student)
  plans!: Plan[];

  @OneToMany(() => ExamAttempt, (attempt) => attempt.student)
  examAttempts!: ExamAttempt[];

  @OneToMany(() => DailyReport, (report) => report.student)
  dailyReports!: DailyReport[];

  @OneToMany(() => RecoveryRequest, (request) => request.student)
  recoveryRequests!: RecoveryRequest[];

  @OneToMany(() => LearningItem, (item) => item.student)
  learningItems!: LearningItem[];
}
