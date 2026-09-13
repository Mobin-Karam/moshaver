import { MigrationInterface, QueryRunner } from "typeorm";

export class ExamPublishing1724142400000 implements MigrationInterface {
  name = "ExamPublishing1724142400000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exams" ADD COLUMN "published" boolean NOT NULL DEFAULT (0)`);
    await queryRunner.query(`UPDATE "exams" SET "published" = 1`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "published"`);
  }
}
