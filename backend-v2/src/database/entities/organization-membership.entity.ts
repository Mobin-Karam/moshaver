import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";
import { UserRoleAssignment } from "./user-role-assignment.entity";

export enum MembershipStatus { ACTIVE="ACTIVE", INACTIVE="INACTIVE", REMOVED="REMOVED" }

@Entity("organization_memberships")
@Index(["organization", "user"], { unique: true })
export class OrganizationMembership {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => Organization, (organization) => organization.memberships, { onDelete: "CASCADE" }) organization!: Organization;
  @ManyToOne(() => User, { onDelete: "CASCADE" }) user!: User;
  @Column({ type: "varchar", length: 20, default: MembershipStatus.ACTIVE }) status!: MembershipStatus;
  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" }) joinedAt!: Date;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @OneToMany(() => UserRoleAssignment, (assignment) => assignment.membership) roleAssignments!: UserRoleAssignment[];
}
