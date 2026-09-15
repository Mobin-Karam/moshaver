import { MigrationInterface, QueryRunner } from "typeorm";

export class StudentQuizCapability1724144600000 implements MigrationInterface {
  name = "StudentQuizCapability1724144600000";

  async up(q: QueryRunner) {
    await q.query(
      `INSERT OR IGNORE INTO permissions(id,code,description) VALUES(lower(hex(randomblob(16))),'student.quizzes.read','View and attempt available student quizzes')`,
    );
    await q.query(
      `INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId) SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code IN ('STUDENT','PLATFORM_ADMIN') AND p.code='student.quizzes.read'`,
    );
  }

  async down(q: QueryRunner) {
    await q.query(
      `DELETE FROM role_permissions WHERE permissionId=(SELECT id FROM permissions WHERE code='student.quizzes.read')`,
    );
    await q.query(`DELETE FROM permissions WHERE code='student.quizzes.read'`);
  }
}
