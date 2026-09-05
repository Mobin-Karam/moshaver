import { Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Permission } from "./permission.entity";
import { Role } from "./role.entity";

@Entity("role_permissions")
@Index(["role", "permission"], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: "CASCADE" }) role!: Role;
  @ManyToOne(() => Permission, (permission) => permission.roles, { onDelete: "CASCADE" }) permission!: Permission;
}
