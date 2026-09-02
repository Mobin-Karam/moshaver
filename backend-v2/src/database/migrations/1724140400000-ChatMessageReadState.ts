import { MigrationInterface, QueryRunner } from "typeorm";

export class ChatMessageReadState1724140400000 implements MigrationInterface {
  name = "ChatMessageReadState1724140400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE chat_messages ADD COLUMN readAt datetime");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE chat_messages DROP COLUMN readAt");
  }
}