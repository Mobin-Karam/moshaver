import { MigrationInterface, QueryRunner } from "typeorm";

export class StaffPlannerCapabilities1724142300000 implements MigrationInterface {
  name = "StaffPlannerCapabilities1724142300000";
  async up(q: QueryRunner): Promise<void> {
    for (const capability of ["plans.delete", "tasks.create", "tasks.delete"]) await q.query(`INSERT OR IGNORE INTO permissions(id,code,description) VALUES(lower(hex(randomblob(16))),?,'')`, [capability]);
    for (const role of ["ADVISOR", "PLATFORM_ADMIN"]) for (const capability of ["plans.delete", "tasks.create", "tasks.delete"]) await q.query(`INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId) SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r,permissions p WHERE r.code=? AND p.code=?`, [role, capability]);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DELETE FROM role_permissions WHERE permissionId IN (SELECT id FROM permissions WHERE code IN ('plans.delete','tasks.create','tasks.delete')) AND roleId IN (SELECT id FROM roles WHERE code IN ('ADVISOR','PLATFORM_ADMIN'))`);
  }
}
