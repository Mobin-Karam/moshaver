import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversationManagement1724142600000 implements MigrationInterface {
  name = "ConversationManagement1724142600000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE conversations ADD COLUMN description varchar NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE conversations ADD COLUMN permissions text NOT NULL DEFAULT ('{}')`);
    await queryRunner.query(`ALTER TABLE conversations ADD COLUMN archivedAt datetime`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE conversations DROP COLUMN archivedAt`);
    await queryRunner.query(`ALTER TABLE conversations DROP COLUMN permissions`);
    await queryRunner.query(`ALTER TABLE conversations DROP COLUMN description`);
  }
}
