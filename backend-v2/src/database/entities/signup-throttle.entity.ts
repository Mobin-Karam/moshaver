import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("signup_throttles")
export class SignupThrottle {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ length: 80 }) key!: string;
  @Column({ default: 0 }) attempts!: number;
  @Column({ type: "datetime" }) windowStartedAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
