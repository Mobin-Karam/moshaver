import { MigrationInterface, QueryRunner } from "typeorm";

const grants: Record<string,string[]> = {
  ADVISOR: ["learning.read","learning.create","learning.update","learning.review"],
  TEACHER: ["learning.read"],
  MENTOR: ["learning.read"],
  PLATFORM_ADMIN: ["learning.read","learning.create","learning.update","learning.review"],
};
export class StaffLearningCapabilities1724142700000 implements MigrationInterface {
  name="StaffLearningCapabilities1724142700000";
  async up(q:QueryRunner){for(const [role,capabilities] of Object.entries(grants))for(const capability of capabilities)await q.query(`INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId) SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r,permissions p WHERE r.code=? AND p.code=?`,[role,capability]);}
  async down(q:QueryRunner){for(const [role,capabilities] of Object.entries(grants))for(const capability of capabilities)await q.query(`DELETE FROM role_permissions WHERE roleId=(SELECT id FROM roles WHERE code=?) AND permissionId=(SELECT id FROM permissions WHERE code=?)`,[role,capability]);}
}
