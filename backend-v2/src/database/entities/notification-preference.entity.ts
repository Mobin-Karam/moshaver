import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
@Entity("notification_preferences")
export class NotificationPreference {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @OneToOne(()=>User,{onDelete:"CASCADE"}) @JoinColumn() user!:User;
  @Column({type:"simple-json",default:"{}"}) categories!:Record<string,boolean>;
  @Column({default:true}) enabled!:boolean;
  @UpdateDateColumn() updatedAt!:Date;
}
