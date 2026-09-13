import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
@Entity("login_throttles")
export class LoginThrottle {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ length: 200 }) key!: string;
  @Column({ default: 0 }) attempts!: number;
  @Column({ type: "datetime" }) windowStartedAt!: Date;
  @Column({ type: "datetime", nullable: true }) lockedUntil?: Date | null;
  @UpdateDateColumn() updatedAt!: Date;
}
