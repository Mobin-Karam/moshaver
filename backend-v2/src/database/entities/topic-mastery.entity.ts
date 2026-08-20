import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("topic_mastery")
@Index(["studentId", "topic"], { unique: true })
export class TopicMastery {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  studentId!: string;

  @Column()
  topic!: string;

  @Column({ default: 0 })
  score!: number;
}
