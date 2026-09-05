import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Conversation } from "./conversation.entity";

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

  @Index()
  @ManyToOne(() => Conversation, { nullable: true, onDelete: "CASCADE" })
  conversation?: Conversation | null;

  @Column({ type: "varchar", length: 40 })
  type!: ChatMessageType;

  @Column()
  content!: string;

  @Column({ type: "simple-json", default: "[]" })
  mentions!: string[];

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: "SET NULL" })
  replyTo?: ChatMessage | null;

  @Column({ type: "datetime", nullable: true }) editedAt?: Date | null;
  @Column({ type: "datetime", nullable: true }) deletedAt?: Date | null;

  @Column({ type: "datetime", nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
