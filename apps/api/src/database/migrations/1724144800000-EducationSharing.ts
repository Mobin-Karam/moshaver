import { MigrationInterface, QueryRunner } from "typeorm";

export class EducationSharing1724144800000 implements MigrationInterface {
  name = "EducationSharing1724144800000";
  async up(q: QueryRunner) {
    await q.query(`INSERT OR IGNORE INTO permissions(id,code,description) VALUES(lower(hex(randomblob(16))),'education.share','Share plans and learning resources with another student')`);
    await q.query(`INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId) SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r CROSS JOIN permissions p WHERE p.code='education.share' AND r.code IN ('STUDENT','ADVISOR','TEACHER','MENTOR','ORGANIZATION_ADMIN','PLATFORM_ADMIN')`);
  }
  async down(q: QueryRunner) {
    await q.query(`DELETE FROM role_permissions WHERE permissionId=(SELECT id FROM permissions WHERE code='education.share')`);
    await q.query(`DELETE FROM permissions WHERE code='education.share'`);
  }
}
