import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskIssueModeration1724142800000 implements MigrationInterface {
  name = "TaskIssueModeration1724142800000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE task_issues ADD COLUMN advisorNote varchar(2000) NOT NULL DEFAULT ('')`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE task_issues DROP COLUMN advisorNote`);
  }
}
