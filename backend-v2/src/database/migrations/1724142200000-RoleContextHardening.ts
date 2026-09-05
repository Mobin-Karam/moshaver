import { MigrationInterface, QueryRunner } from "typeorm";

/** Forward-only authorization correction for databases that already ran the identity migration. */
export class RoleContextHardening1724142200000 implements MigrationInterface {
  name = "RoleContextHardening1724142200000";

  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId)
       SELECT lower(hex(randomblob(16))),r.id,p.id
       FROM roles r, permissions p
       WHERE r.code='GUARDIAN' AND p.code='students.read'`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM role_permissions
       WHERE roleId=(SELECT id FROM roles WHERE code='GUARDIAN')
         AND permissionId=(SELECT id FROM permissions WHERE code='students.read')`,
    );
  }
}
