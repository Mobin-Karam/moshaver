import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("mistakes")
export class Mistake {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  studentId!: string;

  @Column()
  questionId!: string;

  @Column({ default: "" })
  reason!: string;

  @Column({ default: false })
  resolved!: boolean;
}
