import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";import { ChatMessage } from "./chat-message.entity";import { User } from "./user.entity";
@Entity("message_reactions") @Unique(["message","user","emoji"])
export class MessageReaction{@PrimaryGeneratedColumn("uuid")id!:string;@ManyToOne(()=>ChatMessage,{onDelete:"CASCADE"})message!:ChatMessage;@ManyToOne(()=>User,{onDelete:"CASCADE"})user!:User;@Column({length:32})emoji!:string;@CreateDateColumn()createdAt!:Date;}
