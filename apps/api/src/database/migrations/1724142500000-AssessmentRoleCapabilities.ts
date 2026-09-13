import { MigrationInterface, QueryRunner } from "typeorm";

const grants: Record<string, string[]> = {
  ADVISOR: ["retry_requests.read", "retry_requests.moderate"],
  TEACHER: ["syllabus.manage", "retry_requests.read", "quizzes.read", "quizzes.create", "quizzes.update", "quiz_questions.manage"],
  CONTENT_MANAGER: ["syllabus.manage", "quizzes.read", "quizzes.create", "quizzes.update", "quiz_questions.manage"],
};

export class AssessmentRoleCapabilities1724142500000 implements MigrationInterface {
  name = "AssessmentRoleCapabilities1724142500000";
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [role, capabilities] of Object.entries(grants)) {
      for (const capability of capabilities) {
        await queryRunner.query(
          `INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId)
           SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r,permissions p
           WHERE r.code=? AND p.code=?`,
          [role, capability],
        );
      }
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [role, capabilities] of Object.entries(grants)) {
      for (const capability of capabilities) {
        await queryRunner.query(
          `DELETE FROM role_permissions WHERE roleId=(SELECT id FROM roles WHERE code=?) AND permissionId=(SELECT id FROM permissions WHERE code=?)`,
          [role, capability],
        );
      }
    }
  }
}
