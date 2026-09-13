import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Conversation } from "./conversation.entity";import { User } from "./user.entity";
export enum ConversationMemberRole{OWNER="OWNER",ADMIN="ADMIN",MEMBER="MEMBER"}
@Entity("conversation_members") @Unique(["conversation","user"])
export class ConversationMember{
 @PrimaryGeneratedColumn("uuid") id!:string;
 @Index() @ManyToOne(()=>Conversation,c=>c.members,{onDelete:"CASCADE"}) conversation!:Conversation;
 @Index() @ManyToOne(()=>User,{onDelete:"CASCADE"}) user!:User;
 @Column({type:"varchar",length:16,default:ConversationMemberRole.MEMBER}) role!:ConversationMemberRole;
 @Column({default:false}) muted!:boolean;@Column({type:"datetime",nullable:true}) leftAt?:Date|null;
 @Column({type:"datetime",nullable:true}) lastReadAt?:Date|null;@CreateDateColumn() joinedAt!:Date;
}
