import { MigrationInterface, QueryRunner } from "typeorm";

export class SubjectReadCapabilities1724143000000 implements MigrationInterface {
  name = "SubjectReadCapabilities1724143000000";

  async up(queryRunner: QueryRunner) {
    for (const role of ["ORGANIZATION_ADMIN", "PLATFORM_ADMIN"])
      await queryRunner.query(
        `INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId)
         SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r,permissions p
         WHERE r.code=? AND p.code='subjects.read'`,
        [role],
      );
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE roleId IN (SELECT id FROM roles WHERE code IN ('ORGANIZATION_ADMIN','PLATFORM_ADMIN')) AND permissionId=(SELECT id FROM permissions WHERE code='subjects.read')`,
    );
  }
}
