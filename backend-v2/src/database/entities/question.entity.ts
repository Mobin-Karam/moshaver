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

  @Column({ default: "" }) book!: string;
  @Column({ default: "" }) grade!: string;
  @Column({ default: "" }) chapter!: string;
  @Column({ default: "" }) lesson!: string;
  @Column({ default: "" }) subtopic!: string;
  @Column({ default: "multiple_choice" }) questionType!: string;
  @Column({ type: "float", default: 1 }) weight!: number;

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
