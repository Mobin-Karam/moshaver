import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { LearningResourceAssignment } from "./learning-resource-assignment.entity";

@Entity("learning_resources")
export class LearningResource {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ type: "text", default: "" }) description!: string;
  @Column({ length: 24, default: "LINK" }) type!: "LINK" | "VIDEO";
  @Column({ length: 1200 }) url!: string;
  @Column({ length: 20, default: "PUBLISHED" }) status!: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  @ManyToOne(() => User, { onDelete: "CASCADE" }) createdBy!: User;
  @OneToMany(() => LearningResourceAssignment, (assignment) => assignment.resource) assignments!: LearningResourceAssignment[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
