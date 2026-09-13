import type { MigrationInterface, QueryRunner } from "typeorm";

export class ChatTaskLinks1724144500000 implements MigrationInterface {
  name = "ChatTaskLinks1724144500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE chat_messages ADD COLUMN linkedTaskId varchar`,
    );
    await queryRunner.query(
      `CREATE INDEX IDX_chat_message_linked_task ON chat_messages(linkedTaskId)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_chat_message_linked_task`);
    await queryRunner.query(
      `ALTER TABLE chat_messages DROP COLUMN linkedTaskId`,
    );
  }
}
