import { MigrationInterface, QueryRunner } from "typeorm";

export class LearningResources1724143200000 implements MigrationInterface {
  name = "LearningResources1724143200000";
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE learning_resources (id varchar PRIMARY KEY NOT NULL, title varchar(180) NOT NULL, description text NOT NULL DEFAULT (''), type varchar(24) NOT NULL DEFAULT ('LINK'), url varchar(1200) NOT NULL, status varchar(20) NOT NULL DEFAULT ('PUBLISHED'), createdAt datetime NOT NULL DEFAULT (datetime('now')), updatedAt datetime NOT NULL DEFAULT (datetime('now')), createdById varchar NOT NULL, CONSTRAINT FK_learning_resource_creator FOREIGN KEY(createdById) REFERENCES users(id) ON DELETE CASCADE)`);
    await q.query(`CREATE TABLE learning_resource_assignments (id varchar PRIMARY KEY NOT NULL, assignedAt datetime NOT NULL DEFAULT (datetime('now')), resourceId varchar NOT NULL, studentId varchar NOT NULL, CONSTRAINT UQ_learning_resource_student UNIQUE(resourceId, studentId), CONSTRAINT FK_resource_assignment_resource FOREIGN KEY(resourceId) REFERENCES learning_resources(id) ON DELETE CASCADE, CONSTRAINT FK_resource_assignment_student FOREIGN KEY(studentId) REFERENCES students(id) ON DELETE CASCADE)`);
    await q.query(`CREATE INDEX IDX_resource_assignment_resource ON learning_resource_assignments(resourceId)`);
    await q.query(`CREATE INDEX IDX_resource_assignment_student ON learning_resource_assignments(studentId)`);
    for (const code of ["learning_resources.read", "learning_resources.manage"]) await q.query(`INSERT OR IGNORE INTO permissions(id,code,description) VALUES(lower(hex(randomblob(16))),?,?)`, [code, code === "learning_resources.read" ? "View assigned learning resources" : "Create and assign learning resources"]);
    await q.query(`INSERT OR IGNORE INTO role_permissions(id,roleId,permissionId) SELECT lower(hex(randomblob(16))),r.id,p.id FROM roles r CROSS JOIN permissions p WHERE (p.code='learning_resources.read' AND r.code IN ('STUDENT','GUARDIAN','ADVISOR','TEACHER','MENTOR','CONTENT_MANAGER','ORGANIZATION_ADMIN','PLATFORM_ADMIN')) OR (p.code='learning_resources.manage' AND r.code IN ('ADVISOR','TEACHER','MENTOR','CONTENT_MANAGER','ORGANIZATION_ADMIN','PLATFORM_ADMIN'))`);
  }
  async down(q: QueryRunner) {
    await q.query(`DROP INDEX IDX_resource_assignment_student`);
    await q.query(`DROP INDEX IDX_resource_assignment_resource`);
    await q.query(`DROP TABLE learning_resource_assignments`);
    await q.query(`DROP TABLE learning_resources`);
  }
}
