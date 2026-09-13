import type { MigrationInterface, QueryRunner } from "typeorm";
export class StudentGuardianSelection1724144400000 implements MigrationInterface {
  name = "StudentGuardianSelection1724144400000";
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`ALTER TABLE students ADD COLUMN guardianChangedAt datetime`); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`ALTER TABLE students DROP COLUMN guardianChangedAt`); }
}
