import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./role-permission.entity";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index({ unique: true }) @Column({ length: 48 }) code!: string;
  @Column({ length: 120 }) name!: string;
  @Column({ default: false }) organizationScoped!: boolean;
  @OneToMany(() => RolePermission, (item) => item.role) permissions!: RolePermission[];
}
