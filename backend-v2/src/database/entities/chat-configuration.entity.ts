import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("chat_configuration")
export class ChatConfiguration {
  @PrimaryColumn({ type: "varchar", length: 32, default: "platform" })
  id!: string;

  @Column({ type: "simple-json" })
  allowedEmojis!: string[];

  @UpdateDateColumn()
  updatedAt!: Date;
}
