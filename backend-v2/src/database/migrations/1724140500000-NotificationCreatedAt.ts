import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationCreatedAt1724140500000 implements MigrationInterface {
  name = "NotificationCreatedAt1724140500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE notifications ADD COLUMN createdAt datetime NOT NULL DEFAULT (datetime('now'))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE notifications DROP COLUMN createdAt");
  }
}