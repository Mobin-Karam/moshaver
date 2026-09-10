import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { LearningResource } from "./learning-resource.entity";
import { Student } from "./student.entity";

@Entity("learning_resource_assignments")
@Unique(["resource", "student"])
export class LearningResourceAssignment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @ManyToOne(() => LearningResource, (resource) => resource.assignments, { onDelete: "CASCADE" }) resource!: LearningResource;
  @Index() @ManyToOne(() => Student, { onDelete: "CASCADE" }) student!: Student;
  @CreateDateColumn() assignedAt!: Date;
}
