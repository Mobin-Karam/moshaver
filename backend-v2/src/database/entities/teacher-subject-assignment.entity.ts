import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Organization } from "./organization.entity";
import { Subject } from "./subject.entity";
import { User } from "./user.entity";

@Entity("teacher_subject_assignments")
@Index(["teacher", "subject", "organization"], { unique: true })
export class TeacherSubjectAssignment {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) teacher!: User;
  @ManyToOne(() => Subject, { onDelete: "CASCADE" }) subject!: Subject;
  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  organization!: Organization;
  @CreateDateColumn() createdAt!: Date;
}
