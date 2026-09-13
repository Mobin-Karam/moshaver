import type { MigrationInterface, QueryRunner } from "typeorm";

export class ChatUserProfiles1724144200000 implements MigrationInterface {
  name = "ChatUserProfiles1724144200000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN chatDisplayName varchar(100) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN chatBio varchar(500) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN chatAvatarUrl varchar(1200) NOT NULL DEFAULT ('')`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN usernameChangeCount integer NOT NULL DEFAULT (0)`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN usernameChangedAt datetime`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN usernameChangedAt`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN usernameChangeCount`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN chatAvatarUrl`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN chatBio`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN chatDisplayName`);
  }
}
