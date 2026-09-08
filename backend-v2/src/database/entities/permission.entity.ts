import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./role-permission.entity";

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ length: 100 }) code!: string;
  @Column({ length: 180, default: "" }) description!: string;
  @OneToMany(() => RolePermission, (item) => item.permission) roles!: RolePermission[];
}
