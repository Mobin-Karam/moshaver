import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Exam } from "./exam.entity";

@Entity("questions")
export class Question {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: "CASCADE" })
  exam!: Exam;

  @Column()
  text!: string;

  @Column({ type: "simple-json" })
  options!: string[];

  @Column()
  correctAnswer!: string;

  @Column({ default: "" })
  explanation!: string;

  @Column({ default: "" })
  subject!: string;

  @Column({ default: "" })
  topic!: string;

  @Column({ default: "" })
  sectionId!: string;

  @Column({ default: "" })
  mediaUrl!: string;

  @Column({ default: "medium" })
  difficulty!: string;

  @Column({ default: "" })
  source!: string;

  @Column({ type: "simple-json", default: "[]" })
  tags!: string[];
}
