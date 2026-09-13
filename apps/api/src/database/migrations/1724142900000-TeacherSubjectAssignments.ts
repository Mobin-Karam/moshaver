import { MigrationInterface, QueryRunner } from "typeorm";

export class TeacherSubjectAssignments1724142900000 implements MigrationInterface {
  name = "TeacherSubjectAssignments1724142900000";
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(
      `CREATE TABLE "teacher_subject_assignments" ("id" varchar PRIMARY KEY NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "teacherId" varchar NOT NULL, "subjectId" varchar NOT NULL, "organizationId" varchar NOT NULL, CONSTRAINT "FK_teacher_subject_teacher" FOREIGN KEY ("teacherId") REFERENCES "users" ("id") ON DELETE CASCADE, CONSTRAINT "FK_teacher_subject_subject" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE CASCADE, CONSTRAINT "FK_teacher_subject_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_teacher_subject_scope" ON "teacher_subject_assignments" ("teacherId", "subjectId", "organizationId")`,
    );
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_teacher_subject_scope"`);
    await queryRunner.query(`DROP TABLE "teacher_subject_assignments"`);
  }
}
