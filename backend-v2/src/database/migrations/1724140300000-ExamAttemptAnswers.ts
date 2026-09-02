import { MigrationInterface, QueryRunner } from "typeorm";

export class ExamAttemptAnswers1724140300000 implements MigrationInterface {
  name = "ExamAttemptAnswers1724140300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE exam_attempts ADD COLUMN answers text NOT NULL DEFAULT ('[]')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE exam_attempts DROP COLUMN answers`);
  }
}