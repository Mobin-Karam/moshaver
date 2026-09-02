import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("sync_mutations")
@Index(["userId", "mutationId"], { unique: true })
export class SyncMutation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column({ length: 160 })
  mutationId!: string;

  @Column({ length: 20 })
  method!: string;

  @Column({ length: 240 })
  path!: string;

  @Column({ type: "simple-json" })
  result!: unknown;

  @CreateDateColumn()
  createdAt!: Date;
}