import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Organization } from "./organization.entity";
import { StudentSubject } from "./student-subject.entity";
@Entity("subjects") @Index(["organization","code"],{unique:true})
export class Subject{@PrimaryGeneratedColumn("uuid")id!:string;@ManyToOne(()=>Organization,{nullable:true,onDelete:"CASCADE"})organization?:Organization|null;@Column({length:80})code!:string;@Column({length:160})name!:string;@Column({default:true})active!:boolean;@CreateDateColumn()createdAt!:Date;@UpdateDateColumn()updatedAt!:Date;@OneToMany(()=>StudentSubject,item=>item.subject)studentSettings!:StudentSubject[];}
