import type { MigrationInterface, QueryRunner } from "typeorm";

export class GuardianChatPrivacy1724144100000 implements MigrationInterface {
  name = "GuardianChatPrivacy1724144100000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE students ADD COLUMN guardianChatReadOnly boolean NOT NULL DEFAULT (0)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE students DROP COLUMN guardianChatReadOnly`);
  }
}
