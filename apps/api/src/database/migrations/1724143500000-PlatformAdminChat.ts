import type { MigrationInterface, QueryRunner } from "typeorm";

export class PlatformAdminChat1724143500000 implements MigrationInterface {
  name = "PlatformAdminChat1724143500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of [
      "chat.read",
      "chat.send",
      "chat.group.create",
      "chat.group.manage",
      "chat.moderate",
    ]) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO role_permissions(id, roleId, permissionId)
         SELECT lower(hex(randomblob(16))), role.id, permission.id
         FROM roles role, permissions permission
         WHERE role.code = 'PLATFORM_ADMIN' AND permission.code = ?`,
        [permission],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_permissions
       WHERE roleId = (SELECT id FROM roles WHERE code = 'PLATFORM_ADMIN')
         AND permissionId IN (
           SELECT id FROM permissions
           WHERE code IN ('chat.read', 'chat.send', 'chat.group.create', 'chat.group.manage', 'chat.moderate')
         )`,
    );
  }
}
