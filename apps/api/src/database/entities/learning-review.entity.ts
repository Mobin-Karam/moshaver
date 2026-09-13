import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { LearningItem } from "./learning-item.entity";

@Entity("learning_reviews")
export class LearningReview {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => LearningItem, (item) => item.reviews, { onDelete: "CASCADE" }) item!: LearningItem;
  @Column({ type: "float", default: 0 }) rating!: number;
  @Column({ type: "float", default: 0 }) previousMastery!: number;
  @Column({ type: "float", default: 0 }) newMastery!: number;
  @Column({ default: 1 }) previousIntervalDays!: number;
  @Column({ default: 1 }) nextIntervalDays!: number;
  @Column({ type: "date" }) nextReviewAt!: string;
  @CreateDateColumn() reviewedAt!: Date;
}
