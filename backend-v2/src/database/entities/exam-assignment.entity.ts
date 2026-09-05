import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Exam } from "./exam.entity";
import { Student } from "./student.entity";
import { User } from "./user.entity";
@Entity("exam_assignments") @Index(["exam","student"],{unique:true})
export class ExamAssignment{@PrimaryGeneratedColumn("uuid")id!:string;@ManyToOne(()=>Exam,exam=>exam.assignments,{onDelete:"CASCADE"})exam!:Exam;@ManyToOne(()=>Student,{onDelete:"CASCADE"})student!:Student;@ManyToOne(()=>User,{onDelete:"RESTRICT"})assignedBy!:User;@CreateDateColumn()assignedAt!:Date;@CreateDateColumn()createdAt!:Date;}
