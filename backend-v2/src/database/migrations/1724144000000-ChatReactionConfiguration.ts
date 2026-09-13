import type { MigrationInterface, QueryRunner } from "typeorm";

export class ChatReactionConfiguration1724144000000 implements MigrationInterface {
  name = "ChatReactionConfiguration1724144000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "chat_configuration" (
      "id" varchar(32) PRIMARY KEY NOT NULL,
      "allowedEmojis" text NOT NULL,
      "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
    )`);
    await queryRunner.query(
      `INSERT INTO "chat_configuration" ("id", "allowedEmojis") VALUES ('platform', ?)`,
      [JSON.stringify(["❤️", "👍", "😂", "👏", "😮", "😢", "🔥", "🎉", "🙏", "✅"])],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_configuration"`);
  }
}
