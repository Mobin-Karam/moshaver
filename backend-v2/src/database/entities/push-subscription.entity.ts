import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
@Entity("push_subscriptions")
export class PushSubscription {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Index() @ManyToOne(()=>User,{onDelete:"CASCADE"}) user!:User;
  @Index({unique:true}) @Column({length:2048}) endpoint!:string;
  @Column({length:512}) p256dh!:string;
  @Column({length:256}) auth!:string;
  @Column({default:""}) userAgent!:string;
  @Column({default:0}) failureCount!:number;
  @Column({type:"datetime",nullable:true}) lastSuccessAt?:Date|null;
  @CreateDateColumn() createdAt!:Date;
  @UpdateDateColumn() updatedAt!:Date;
}
