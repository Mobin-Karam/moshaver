import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: "CASCADE" })
  user!: User;

  @Index({ unique: true })
  @Column()
  tokenHash!: string;

  @Column()
  csrfToken!: string;

  @Index()
  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
