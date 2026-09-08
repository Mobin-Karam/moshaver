import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrganizationMembership } from "./organization-membership.entity";

export enum OrganizationType { SCHOOL="SCHOOL", ACADEMY="ACADEMY", COUNSELING_CENTER="COUNSELING_CENTER", PRIVATE_PRACTICE="PRIVATE_PRACTICE", OTHER="OTHER" }
export enum OrganizationStatus { ACTIVE="ACTIVE", INACTIVE="INACTIVE", ARCHIVED="ARCHIVED" }

@Entity("organizations")
export class Organization {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column({ length: 180 }) name!: string;
  @Column({ type: "varchar", length: 32 }) type!: OrganizationType;
  @Column({ type: "varchar", length: 20, default: OrganizationStatus.ACTIVE }) status!: OrganizationStatus;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @OneToMany(() => OrganizationMembership, (membership) => membership.organization) memberships!: OrganizationMembership[];
}
