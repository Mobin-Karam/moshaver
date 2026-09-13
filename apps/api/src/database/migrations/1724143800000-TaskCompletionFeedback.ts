import { MigrationInterface, QueryRunner } from "typeorm";

export class TaskCompletionFeedback1724143800000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE tasks ADD COLUMN actualMinutes integer NOT NULL DEFAULT (0)`);
    await q.query(`ALTER TABLE tasks ADD COLUMN actualTests integer NOT NULL DEFAULT (0)`);
    await q.query(`ALTER TABLE tasks ADD COLUMN completionDifficulty varchar NOT NULL DEFAULT ('')`);
    await q.query(`ALTER TABLE tasks ADD COLUMN completionNote varchar NOT NULL DEFAULT ('')`);
  }

  async down(q: QueryRunner) {
    await q.query(`ALTER TABLE tasks DROP COLUMN completionNote`);
    await q.query(`ALTER TABLE tasks DROP COLUMN completionDifficulty`);
    await q.query(`ALTER TABLE tasks DROP COLUMN actualTests`);
    await q.query(`ALTER TABLE tasks DROP COLUMN actualMinutes`);
  }
}
