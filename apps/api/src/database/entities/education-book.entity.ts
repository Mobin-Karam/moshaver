import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("education_books")
@Index(["schoolYear", "grade"])
export class EducationBook {
  @PrimaryColumn({ length: 120 }) id!: string;
  @Column({ length: 12 }) country!: string;
  @Column({ length: 16 }) schoolYear!: string;
  @Column({ type: "integer" }) grade!: number;
  @Column({ length: 80 }) level!: string;
  @Column({ length: 120 }) branch!: string;
  @Column({ length: 160 }) track!: string;
  @Column({ length: 160 }) category!: string;
  @Column({ length: 240 }) titleFa!: string;
  @Column({ length: 240 }) titleEn!: string;
  @Column({ type: "varchar", length: 80, nullable: true }) textbookCode?: string | null;
  @Column({ type: "simple-json" }) appliesTo!: string[];
  @Column({ type: "text", nullable: true }) notes?: string | null;
}
