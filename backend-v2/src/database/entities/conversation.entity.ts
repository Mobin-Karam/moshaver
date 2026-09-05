import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { ConversationMember } from "./conversation-member.entity";
export enum ConversationType{DIRECT="DIRECT",GROUP="GROUP"}
@Entity("conversations")
export class Conversation{
 @PrimaryGeneratedColumn("uuid") id!:string;
 @Column({type:"varchar",length:16}) type!:ConversationType;
 @Column({default:""}) title!:string;
 @ManyToOne(()=>User,{nullable:true,onDelete:"SET NULL"}) owner?:User|null;
 @OneToMany(()=>ConversationMember,m=>m.conversation) members!:ConversationMember[];
 @CreateDateColumn() createdAt!:Date;@UpdateDateColumn() updatedAt!:Date;
}
