import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { StudentDailyRelaxation } from "./student-daily-relaxation.entity";

@Entity("relaxation_tracks")
export class RelaxationTrack {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ length: 120, default: "" }) artist!: string;
  @Column({ length: 1600 }) url!: string;
  @Column({ default: true }) active!: boolean;
  @OneToMany(() => StudentDailyRelaxation, (selection) => selection.track) selections!: StudentDailyRelaxation[];
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
