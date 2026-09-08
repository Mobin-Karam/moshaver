import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Organization } from "./organization.entity";
import { Student } from "./student.entity";
import { User } from "./user.entity";

export enum RelationshipType { GUARDIAN_OF="GUARDIAN_OF", ADVISOR_OF="ADVISOR_OF", TEACHER_OF="TEACHER_OF", MENTOR_OF="MENTOR_OF" }
export enum RelationshipStatus { PENDING="PENDING", ACTIVE="ACTIVE", REJECTED="REJECTED", REVOKED="REVOKED" }

@Entity("user_relationships")
@Index(["fromUser", "toStudent", "organization", "type"], { unique: true })
export class UserRelationship {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) fromUser!: User;
  @ManyToOne(() => Student, { onDelete: "CASCADE" }) toStudent!: Student;
  @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" }) organization?: Organization | null;
  @Column({ type: "varchar", length: 24 }) type!: RelationshipType;
  @Index() @Column({ type: "varchar", length: 20, default: RelationshipStatus.PENDING }) status!: RelationshipStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @Column({ type: "datetime", nullable: true }) acceptedAt?: Date | null;
  @Column({ type: "datetime", nullable: true }) revokedAt?: Date | null;
}
