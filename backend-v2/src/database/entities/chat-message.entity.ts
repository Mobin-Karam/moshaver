import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export enum ChatMessageType {
  TEXT = "TEXT",
  PLAN = "PLAN",
  EXAM = "EXAM",
  TASK = "TASK",
  MOTIVATION = "MOTIVATION",
  WARNING = "WARNING",
}

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @ManyToOne(() => User, (user) => user.sentMessages, { onDelete: "CASCADE" })
  sender!: User;

  @Index()
  @Column()
  receiverId!: string;

  @Column({ type: "varchar", length: 40 })
  type!: ChatMessageType;

  @Column()
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
